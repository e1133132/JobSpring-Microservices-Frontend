/* eslint-disable */
import { vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import JobDetail from './JobDetail.jsx';
import api from '../../services/api.js';

vi.mock('../../App.css', () => ({}), { virtual: true });

vi.mock('../navigation.jsx', () => ({
    default: () => <div data-testid="nav" />,
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
    const real = await vi.importActual('react-router-dom');
    return {
        ...real,
        useNavigate: () => navigateMock,
    };
});

vi.mock('../../services/api.js', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('../../services/authService', () => ({
    getCurrentUser: () => ({ role: 'CANDIDATE', fullName: 'Alice' }),
}));

vi.spyOn(window, 'alert').mockImplementation(() => {});

const sampleJob = {
    id: 101,
    title: 'Software Engineer Intern',
    company: 'Google',
    companyId: 5,
    salaryMin: 4000,
    salaryMax: 6000,
    location: 'Singapore',
    employmentType: 2,
    description: 'Work on exciting projects.',
    postedAt: '2025-09-10T08:00:00Z',
};

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('jobspring_token', 'mock-token');

    api.get.mockImplementation((url) => {
        if (url === '/api/job/job_list') {
            return Promise.resolve({ data: { content: [sampleJob] } });
        }
        if (url.includes('/api/user/job_favorites/')) {
            return Promise.resolve({ data: true });
        }
        if (url === '/api/user/profile') {
            return Promise.resolve({
                data: {
                    profile: { summary: 'Energetic developer' },
                },
            });
        }
        return Promise.resolve({ data: {} });
    });
});

function renderDetail(id = '101') {
    return render(
        <MemoryRouter initialEntries={[`/jobs/${id}`]}>
            <Routes>
                <Route path="/jobs/:id" element={<JobDetail />} />
            </Routes>
        </MemoryRouter>
    );
}

test('renders job details correctly', async () => {
    renderDetail();

    const title = await screen.findByText(/Software Engineer Intern/i);
    expect(title).toBeInTheDocument();
    expect(screen.getByText(/Google/)).toBeInTheDocument();
    expect(screen.getAllByText(/Singapore/)).toHaveLength(2);
    expect(screen.getByText(/Internship/)).toBeInTheDocument();
    expect(screen.getByText(/Work on exciting projects/)).toBeInTheDocument();
});

test('shows upload modal and submits application', async () => {
    renderDetail();

    const applyBtn = await screen.findByRole('button', { name: /Apply Now/i });
    await userEvent.click(applyBtn);

    const modal = await screen.findByText(/Upload Resume/i);
    expect(modal).toBeInTheDocument();

    const file = new File(['dummy'], 'resume.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('resume-input');
    await userEvent.upload(input, file);

    api.post.mockResolvedValue({ data: { publicId: 'xyz' } });
    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
            '/api/application/applications/101/applications',
            expect.any(FormData)
        );
    });
    expect(window.alert).toHaveBeenCalledWith('Apply successfully!');
});

test('toggle favorite adds/removes correctly', async () => {
    renderDetail();

    const favBtn = await screen.findByTestId('fav-btn');
    expect(favBtn).toBeInTheDocument();

    api.delete.mockResolvedValue({ data: {} });
    await userEvent.click(favBtn);
    await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/api/user/job_favorites/101', {
            headers: { Authorization: 'Bearer mock-token' },
        });
    });

    api.post.mockResolvedValue({ data: {} });
    await userEvent.click(favBtn);
    await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
            '/api/user/job_favorites/101',
            {},
            { headers: { Authorization: 'Bearer mock-token' } }
        );
    });
});

test('navigates to company page when clicking company name', async () => {
    renderDetail();

    const company = await screen.findByText(/Google/);
    await userEvent.click(company);

    expect(navigateMock).toHaveBeenCalledWith('/company/5');
});
