/* eslint-disable */
import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

// ---------- Mocks ----------
vi.mock('../navigation.jsx', () => ({ default: () => <div data-testid="nav" /> }))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom')
  return { ...real, useNavigate: () => navigateMock }
})

vi.mock('../../services/authService', () => ({
  getCurrentUser: () => ({ role: 1, fullName: 'HR Henry' }),
}))

const apiGet = vi.fn()
vi.mock('../../services/api.js', () => ({
  __esModule: true,
  default: { get: (...args) => apiGet(...args) },
}))

// ---------- Import component AFTER mocks ----------
import CheckCompanyJobPosition from './checkCompanyJobPosition'

// Helpers
function renderPage() {
  return render(
    <MemoryRouter>
      <CheckCompanyJobPosition />
    </MemoryRouter>
  )
}

// NOTE: use numeric statuses so normalizePosition() works correctly
const sampleList = [
  {
    id: 11,
    title: 'Frontend Dev',
    companyName: 'Acme Corp',
    location: 'Singapore',
    type: 'Full-time',
    status: 0, // valid
    postedAt: '2025-09-20T10:00:00Z',
  },
  {
    id: 22,
    title: 'Data Analyst',
    companyName: 'Acme Corp',
    location: 'Singapore',
    type: 'Contract',
    status: 1, // invalid
    postedAt: '2025-09-19T10:00:00Z',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

test('loads positions, shows company name, fields and update/closed buttons', async () => {
  apiGet.mockResolvedValueOnce({ data: { content: sampleList } })

  renderPage()

  await waitFor(() => {
    expect(apiGet).toHaveBeenCalledWith('/api/job/companies/jobs')
  })

  // Header & company name
  expect(await screen.findByText(/My Company Positions/i)).toBeInTheDocument()
  expect(screen.getByText(/— Acme Corp/i)).toBeInTheDocument()

  // First card (Frontend Dev) should have Update button
  const firstCard = screen.getByText('Frontend Dev').closest('article')
  expect(firstCard).toBeInTheDocument()
  expect(within(firstCard).getByText(/valid/i)).toBeInTheDocument()
  expect(within(firstCard).getByRole('button', { name: /Update/i })).toBeEnabled()

  // Second card (Data Analyst) should have Closed (disabled)
  const secondCard = screen.getByText('Data Analyst').closest('article')
  expect(secondCard).toBeInTheDocument()
  expect(within(secondCard).getByText(/invalid/i)).toBeInTheDocument()
  expect(within(secondCard).getByRole('button', { name: /Closed/i })).toBeDisabled()
})

test('clicking Update navigates to job detail with state', async () => {
  apiGet.mockResolvedValueOnce({ data: { content: sampleList } })
  renderPage()

  const firstCard = await screen.findByText('Frontend Dev').then(el => el.closest('article'))
  const updateBtn = within(firstCard).getByRole('button', { name: /Update/i })
  await userEvent.click(updateBtn)

  expect(navigateMock).toHaveBeenCalledWith('/hr/jobs-detail/11', { state: { id: 11 } })
})

test('Refresh button calls API again and updates list', async () => {
  // 1st load -> sampleList
  apiGet
    .mockResolvedValueOnce({ data: { content: sampleList } })
    // 2nd load -> only one item
    .mockResolvedValueOnce({
      data: {
        content: [
          {
            id: 33,
            title: 'QA Engineer',
            companyName: 'Acme Corp',
            location: 'Singapore',
            type: 'Full-time',
            status: 0,
            postedAt: '2025-09-22T10:00:00Z',
          },
        ],
      },
    })

  renderPage()

  await screen.findByText('Frontend Dev')
  expect(screen.getByText('Data Analyst')).toBeInTheDocument()

  const refresh = screen.getByRole('button', { name: /Refresh/i })
  await userEvent.click(refresh)

  await waitFor(() => {
    expect(apiGet).toHaveBeenCalledTimes(2)
  })

  expect(await screen.findByText('QA Engineer')).toBeInTheDocument()
  expect(screen.queryByText('Frontend Dev')).not.toBeInTheDocument()
  expect(screen.queryByText('Data Analyst')).not.toBeInTheDocument()
})

test('shows empty state when list is empty', async () => {
  apiGet.mockResolvedValueOnce({ data: { content: [] } })
  renderPage()

  expect(await screen.findByText(/No positions found/i)).toBeInTheDocument()
})

test('shows error message when API fails', async () => {
  const err = new Error('Boom')
  err.response = { data: { message: 'Forbidden' } }
  apiGet.mockRejectedValueOnce(err)

  renderPage()

  expect(await screen.findByText(/Forbidden/i)).toBeInTheDocument()
  expect(screen.queryByText(/No positions found/i)).not.toBeInTheDocument()
})
