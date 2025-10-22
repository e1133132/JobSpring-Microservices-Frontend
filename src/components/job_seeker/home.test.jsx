/* eslint-disable */

import { vi } from 'vitest';
vi.mock('../../App.css', () => ({}), { virtual: true });

vi.mock('../navigation.jsx', () => ({ default: () => <div data-testid="nav" /> }));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom');
  return { ...real, useNavigate: () => navigateMock };
});

vi.mock('../../services/api.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('axios', () => ({ default: { get: vi.fn() } }));

vi.mock('../../services/authService', () => ({
  getCurrentUser: () => ({ role: 0, fullName: 'Alice' }),
}));

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import Home from './home.jsx';
import api from '../../services/api.js';
import axios from 'axios';

const jobs = [
  { id: 1, title: 'Frontend Dev', company: 'Acme', location: 'Singapore', tags: ['react','js'], employmentType: 'full-time', description: 'Build UI', postedAt: '2025-09-20' },
  { id: 2, title: 'Data Analyst',  company: 'Beta', location: 'Singapore', tags: ['sql'],       employmentType: 'contract',  description: 'Analyze data', postedAt: '2025-09-21' },
];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('jobspring_token', 'test-token');

  api.get.mockImplementation((url) => {
    if (url === '/api/job/job_list') return Promise.resolve({ data: { content: jobs } });
    if (url === '/api/user/job_favorites')          return Promise.resolve({ data: { content: [{ jobId: 1 }] } });
    return Promise.resolve({ data: {} });
  });

  axios.get.mockResolvedValue({ data: { content: [jobs[1]] } });

  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

function renderHome() {
  return render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
  );
}

test('loads jobs and favorites on mount', async () => {
  renderHome();

  expect(await screen.findByText(/Frontend Dev/i)).toBeInTheDocument();
  expect(screen.getByText(/Data Analyst/i)).toBeInTheDocument();
  expect(screen.getByText(/Showing 2 results?/i)).toBeInTheDocument();

  const first = screen.getByRole('article', { name: /Frontend Dev at Acme/i });
  const fav1 = within(first).getAllByRole('button')[1];
  expect(fav1).toHaveStyle({ color: '#fbbf24' });

  const second = screen.getByRole('article', { name: /Data Analyst at Beta/i });
  const fav2 = within(second).getAllByRole('button')[1];
  expect(fav2).toHaveStyle({ color: '#6b7280' });
});

test('search calls /job_list/search and updates list', async () => {
  renderHome();

  const searchInput = await screen.findByPlaceholderText(/Search jobs, companies, locations, or tags/i);
  await userEvent.clear(searchInput);
  await userEvent.type(searchInput, 'data');
  await userEvent.click(screen.getByRole('button', { name: /search/i }));

  expect(axios.get).toHaveBeenCalledWith('/api/job/job_list/search', {
    params: { keyword: 'data', page: 0, size: 50 },
  });

  expect(await screen.findByText(/Data Analyst/i)).toBeInTheDocument();
  expect(screen.queryByText(/Frontend Dev/i)).not.toBeInTheDocument();
  expect(screen.getByText(/Showing 1 result/i)).toBeInTheDocument();
});

test('clicking Apply navigates to detail page', async () => {
  renderHome();

  const first = await screen.findByRole('article', { name: /Frontend Dev at Acme/i });
  const applyBtn = within(first).getByRole('button', { name: /apply/i });
  await userEvent.click(applyBtn);

  expect(navigateMock).toHaveBeenCalledWith('/jobs/1');
});

test('toggling favorite adds/removes via API and updates UI', async () => {
  renderHome();

  const second = await screen.findByRole('article', { name: /Data Analyst at Beta/i });
  const fav2 = within(second).getAllByRole('button')[1];


  api.post.mockResolvedValue({ data: {} });
  await userEvent.click(fav2);
  expect(api.post).toHaveBeenCalledWith('/api/user/job_favorites/2', {}, {
    headers: { Authorization: 'Bearer test-token' },
  });
  await waitFor(() => expect(fav2).toHaveStyle({ color: '#fbbf24' }));

  api.delete.mockResolvedValue({ data: {} });
  await userEvent.click(fav2);
  expect(api.delete).toHaveBeenCalledWith('/api/user/job_favorites/2', {
    headers: { Authorization: 'Bearer test-token' },
  });
  await waitFor(() => expect(fav2).toHaveStyle({ color: '#6b7280' }));
});