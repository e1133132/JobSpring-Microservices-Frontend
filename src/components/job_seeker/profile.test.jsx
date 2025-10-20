/* eslint-disable */
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Profile from './Profile.jsx';
import api from '../../services/api.js';

vi.mock('../../App.css', () => ({}), { virtual: true });

vi.mock('../navigation.jsx', () => ({
    default: () => <div data-testid="nav" />,
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
    const real = await vi.importActual('react-router-dom');
    return { ...real, useNavigate: () => navigateMock };
});

vi.mock('../../services/api.js', () => ({
    default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('../../services/authService', () => ({
    getCurrentUser: () => ({ role: 'CANDIDATE', fullName: 'Alice' }),
}));

vi.spyOn(window, 'alert').mockImplementation(() => {});

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('jobspring_token', 'mock-token');

    api.get
        .mockImplementationOnce(() =>
            Promise.resolve({
                data: {
                    profile: { summary: 'Existing summary', visibility: 2 },
                    education: [
                        {
                            school: 'NUS',
                            degree: 'BSc',
                            major: 'CS',
                            start_date: '2020-08-01',
                            end_date: '2024-05-30',
                            gpa: 4.5,
                        },
                    ],
                    experience: [
                        {
                            company: 'Google',
                            title: 'Intern',
                            start_date: '2024-06-01',
                            end_date: '2024-08-01',
                            achievements: 'Improved API speed',
                        },
                    ],
                    skills: [
                        {
                            skill_name: 'React',
                            skill_id: 1,
                            level: 3,
                            years: 1,
                            category: 'Frontend',
                        },
                    ],
                },
            })
        )
        .mockImplementationOnce(() =>
            Promise.resolve({
                data: [{ id: 1, name: 'React', category: 'Frontend' }],
            })
        );
});

function renderProfile() {
    return render(
        <MemoryRouter>
            <Profile />
        </MemoryRouter>
    );
}

test('renders profile form and fills initial values', async () => {
    renderProfile();

    const summaryInput = await screen.findByPlaceholderText(/Please enter your profile summary/i);
    expect(summaryInput).toHaveValue('Existing summary');

    expect(screen.getByDisplayValue('NUS')).toBeInTheDocument();
    expect(screen.getByDisplayValue('BSc')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CS')).toBeInTheDocument();

    expect(screen.getByDisplayValue('Google')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Intern')).toBeInTheDocument();
});

test('allows user to edit fields and submit form', async () => {
    renderProfile();

    const summary = await screen.findByPlaceholderText(/Please enter your profile summary/i);
    await userEvent.clear(summary);
    await userEvent.type(summary, 'Updated summary');

    const schoolInput = screen.getByPlaceholderText(/School name/i);
    await userEvent.clear(schoolInput);
    await userEvent.type(schoolInput, 'NUS-ISS');

    const degreeInput = screen.getByPlaceholderText(/Degree/i);
    await userEvent.clear(degreeInput);
    await userEvent.type(degreeInput, 'MTech');

    api.post.mockResolvedValue({ data: { success: true } });
    const saveBtn = screen.getByRole('button', { name: /Save/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
            '/api/user/profile',
            expect.objectContaining({
                profile: expect.objectContaining({
                    summary: 'Updated summary',
                }),
                education: expect.any(Array),
                experience: expect.any(Array),
                skills: expect.any(Array),
            }),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: `Bearer mock-token`,
                }),
            })
        );
    });

    expect(window.alert).toHaveBeenCalledWith('Profile Submitted Successfully!');
});

test('reset button clears form fields', async () => {
    renderProfile();

    const summary = await screen.findByPlaceholderText(/Please enter your profile summary/i);
    expect(summary).toHaveValue('Existing summary');

    const resetBtn = screen.getByRole('button', { name: /Reset/i });
    await userEvent.click(resetBtn);

    expect(summary).toHaveValue('');
});

test('back button navigates to home', async () => {
    renderProfile();

    const backBtn = await screen.findByRole('button', { name: /Back/i });
    await userEvent.click(backBtn);

    expect(navigateMock).toHaveBeenCalledWith('/home');
});
