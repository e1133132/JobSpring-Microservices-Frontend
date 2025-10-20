/* eslint-disable */
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CompanyDetail from './CompanyDetail.jsx';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const real = await vi.importActual('react-router-dom');
    return { ...real, useNavigate: () => mockNavigate };
});

vi.mock('../../App.css', () => ({}), { virtual: true });
vi.mock('../navigation.jsx', () => ({ default: () => <div data-testid="nav" /> }));
vi.mock('../../services/authService', () => ({
    getCurrentUser: () => ({ fullName: 'Alice', role: 0 }),
}));
vi.mock('../../services/api.js', () => ({ default: { get: vi.fn() } }));


import api from '../../services/api.js';

function renderWithRouter(companyId = '123') {
    return render(
        <MemoryRouter initialEntries={[`/company/${companyId}`]}>
            <Routes>
                <Route path="/company/:companyId" element={<CompanyDetail />} />
            </Routes>
        </MemoryRouter>
    );
}

describe('CompanyDetail', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('jobspring_token', 'mock-token');
    });

    test('renders company details correctly', async () => {
        const companyData = {
            id: 123,
            name: 'OpenAI',
            website: 'https://openai.com',
            description: 'We build AI for everyone.',
            logoUrl: 'https://logo.png',
            location: 'San Francisco',
        };

        const jobsData = {
            content: [
                {
                    id: 1,
                    title: 'AI Engineer',
                    description: 'Build GPT models',
                    postedAt: '2025-09-10',
                    salaryMin: 8000,
                    salaryMax: 12000,
                },
            ],
        };

        api.get
            .mockResolvedValueOnce({ data: companyData })
            .mockResolvedValueOnce({ data: jobsData });

        renderWithRouter();

        expect(await screen.findByText(/Loading company details/i)).toBeInTheDocument();

        await waitFor(() => expect(screen.getByRole('heading', { name: /OpenAI/i })).toBeInTheDocument());

        expect(screen.getAllByText(/OpenAI/i)[0]).toBeInTheDocument();
        expect(screen.getByText(/San Francisco/i)).toBeInTheDocument();
        expect(screen.getByText(/We build AI for everyone/i)).toBeInTheDocument();
        expect(screen.getByRole('img', { name: /company logo/i })).toHaveAttribute('src', 'https://logo.png');

        expect(screen.getByRole('button', { name: /Company Intro/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Posted Jobs/i })).toBeInTheDocument();

        const link = screen.getByRole('link', { name: /openai\.com/i });
        expect(link).toHaveAttribute('href', 'https://openai.com');
    });

    test('switches to jobs tab and shows jobs', async () => {
        const companyData = { id: 1,
            name: 'Google',
            description: 'Search the world',
            website: 'https://google.com' };
        const jobsData = {
            content: [
                { id: 101,
                    title: 'Software Engineer',
                    description: 'Build features',
                    postedAt: '2025-09-12',
                    salaryMin: 5000,
                    salaryMax: 7000 },
            ],
        };

        api.get
            .mockResolvedValueOnce({ data: companyData })
            .mockResolvedValueOnce({ data: jobsData });

        renderWithRouter('1');

        await waitFor(() => screen.getByRole('heading', { name: /Google/i }));

        const jobsTab = screen.getByRole('button', { name: /Posted Jobs/i });
        await userEvent.click(jobsTab);

        expect(await screen.findByText(/Software Engineer/i)).toBeInTheDocument();
        expect(screen.getByText(/Build features/i)).toBeInTheDocument();
        expect(screen.getByText(/Salary: \$5000 - \$7000/)).toBeInTheDocument();
    });

    test('shows empty jobs message when no jobs', async () => {
        api.get
            .mockResolvedValueOnce({ data: { id: 1, name: 'NoJobs Co', description: 'Empty company' } })
            .mockResolvedValueOnce({ data: { content: [] } });

        renderWithRouter('1');

        await waitFor(() => screen.getByText(/NoJobs Co/i));
        await userEvent.click(screen.getByRole('button', { name: /Posted Jobs/i }));

        expect(await screen.findByText(/No active jobs posted yet/i)).toBeInTheDocument();
    });

    test('handles error gracefully', async () => {
        api.get.mockRejectedValueOnce(new Error('Network error'));
        renderWithRouter('999');
        await waitFor(() => screen.getByText(/Failed to load company details/i));
    });

    test('back button triggers navigate(-1)', async () => {
        api.get
            .mockResolvedValueOnce({ data: { id: 1, name: 'BackTest', description: 'desc' } })
            .mockResolvedValueOnce({ data: { content: [] } });

        renderWithRouter('1');

        await waitFor(() => screen.getByText(/BackTest/i));
        const backBtn = screen.getByRole('button', { name: /Back/i });
        await userEvent.click(backBtn);

        expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

});
