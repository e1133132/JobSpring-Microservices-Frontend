/* eslint-disable */
import { vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Apply_progress from './apply_progress.jsx';
import api from '../../services/api.js';
import axios from 'axios';

vi.mock('../../App.css', () => ({}), { virtual: true });

vi.mock('../navigation.jsx', () => ({
    default: () => <div data-testid="nav" />,
}));

vi.mock('../../services/authService', () => ({
    getCurrentUser: () => ({ fullName: 'Alice', role: 0 }),
}));

vi.mock('../../services/api.js', () => ({
    default: { get: vi.fn() },
}));
vi.mock('axios', () => ({ default: { get: vi.fn() } }));

const mockApplications = [
    { id: 1, jobId: 11, jobTitle: 'Frontend Dev', companyName: 'Meta', status: 0, appliedAt: '2025-09-10T04:00:00Z' },
    { id: 2, jobId: 22, jobTitle: 'Backend Dev', companyName: 'Google', status: 1, appliedAt: '2025-09-11T06:00:00Z' },
    { id: 3, jobId: 33, jobTitle: 'Data Analyst', companyName: 'OpenAI', status: 2, appliedAt: '2025-09-12T10:00:00Z' },
];

const mockSavedJobs = [
    { id: 10, jobId: 111, title: 'DevOps Engineer', company: 'Amazon', favoritedAt: '2025-09-20T12:00:00Z' },
];

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('jobspring_token', 'token-123');
});

function renderApply() {
    return render(
        <MemoryRouter>
            <Apply_progress />
        </MemoryRouter>
    );
}

test('renders submitted applications by default', async () => {
    api.get.mockResolvedValueOnce({ data: { content: mockApplications } });
    axios.get.mockResolvedValueOnce({ data: { content: mockSavedJobs, totalElements: 1 } });

    renderApply();

    await waitFor(() => screen.getByText(/Frontend Dev/i));

    expect(screen.getByText(/Frontend Dev/i)).toBeInTheDocument();
    expect(screen.queryByText(/Backend Dev/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Submitted/i).closest('button')).toHaveClass('active');
});

test('switches to viewed and shows correct job', async () => {
    api.get.mockResolvedValueOnce({ data: { content: mockApplications } });
    axios.get.mockResolvedValueOnce({ data: { content: mockSavedJobs, totalElements: 1 } });

    renderApply();

    const viewedTab = await screen.findByRole('tab', { name: /Viewed/i });
    await userEvent.click(viewedTab);

    expect(screen.getByText(/Backend Dev/i)).toBeInTheDocument();
    expect(screen.getByText(/Google/i)).toBeInTheDocument();
    expect(viewedTab).toHaveClass('active');
});

test('switches to passed and shows correct job', async () => {
    api.get.mockResolvedValueOnce({ data: { content: mockApplications } });
    axios.get.mockResolvedValueOnce({ data: { content: mockSavedJobs, totalElements: 1 } });

    renderApply();

    const passedTab = await screen.findByRole('tab', { name: /Passed/i });
    await userEvent.click(passedTab);

    expect(await screen.findByText(/Data Analyst/i)).toBeInTheDocument();
    expect(screen.getByText(/OpenAI/i)).toBeInTheDocument();
});

test('switches to saved and shows saved jobs', async () => {
    api.get.mockResolvedValueOnce({ data: { content: mockApplications } });
    axios.get.mockResolvedValueOnce({ data: { content: mockSavedJobs, totalElements: 1 } });

    renderApply();

    const tablist = screen.getByRole('tablist');
    const savedTab = within(tablist).getByRole('tab', { name: /^Saved/i });
    await userEvent.click(savedTab);

    expect(await screen.findByText(/DevOps Engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/Amazon/i)).toBeInTheDocument();

    expect(savedTab).toHaveClass('active');
});


test('shows empty message when no data', async () => {
    api.get.mockResolvedValueOnce({ data: { content: [] } });
    axios.get.mockResolvedValueOnce({ data: { content: [], totalElements: 0 } });

    renderApply();

    await waitFor(() => screen.getByText(/No applications/i));
    expect(screen.getByText(/No applications in this status/i)).toBeInTheDocument();

    const savedTab = screen.getByRole('tab', { name: /Saved/i });
    await userEvent.click(savedTab);
    await waitFor(() => screen.getByText(/No saved jobs/i));
    expect(screen.getByText(/No saved jobs yet/i)).toBeInTheDocument();
});
