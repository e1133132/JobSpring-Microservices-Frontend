/* eslint-disable */
import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import AdminDashboard from './dashboard'


vi.mock('../navigation.jsx', () => ({ default: () => <div data-testid="nav" /> }))

vi.mock('../../services/authService', () => ({
  getCurrentUser: () => ({ role: 2, fullName: 'Alice Admin' }),
}))

// API
const apiGetMock = vi.fn()
const apiPostMock = vi.fn()
vi.mock('../../services/api.js', () => ({
  __esModule: true,
  default: {
    get: (...args) => apiGetMock(...args),
    post: (...args) => apiPostMock(...args),
  },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  )
}

const jobs = [
  {
    id: 1,
    jobId: 1,           
    title: 'Frontend Dev',
    company: 'Acme',
    companyId: 10,
    status: 0,       
  },
  {
    id: 2,
    jobId: 2,
    title: 'Data Analyst',
    company: 'Beta',
    companyId: 11,
    status: 1,         
  },
  {
    id: 3,
    jobId: 3,
    title: 'Backend Eng',
    company: 'Gamma',
    companyId: 12,
    status: 'invalid',  
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  apiGetMock.mockResolvedValue({ data: jobs })
})

test('loads jobs and shows count + basic fields', async () => {
  renderPage()

  await waitFor(() => {
    expect(apiGetMock).toHaveBeenCalledWith('/api/job/status')
  })

  expect(await screen.findByRole('heading', { name: /jobs/i })).toBeInTheDocument()
  expect(screen.getByText(/showing 3 results/i)).toBeInTheDocument()

  expect(screen.getByLabelText(/job 1/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/job 2/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/job 3/i)).toBeInTheDocument()

  const card1 = screen.getByLabelText(/job 1/i)
  expect(within(card1).getByText(/status:\s*active/i)).toBeInTheDocument()

  const card2 = screen.getByLabelText(/job 2/i)
  expect(within(card2).getByText(/status:\s*inactive/i)).toBeInTheDocument()

  const card3 = screen.getByLabelText(/job 3/i)
  expect(within(card3).getByText(/status:\s*inactive/i)).toBeInTheDocument()
})

test('keyword search filters by title/company', async () => {
  renderPage()
  await screen.findByText(/showing 3 results/i)

  const input = screen.getByPlaceholderText(/input title \/ company \/ status to search/i)

  await userEvent.type(input, 'acme')
  expect(screen.getByText(/showing 1 result/i)).toBeInTheDocument()
  expect(screen.getByText(/frontend dev/i)).toBeInTheDocument()
  expect(screen.queryByText(/data analyst/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/backend eng/i)).not.toBeInTheDocument()
})

test('clicking "invalid" on an active job posts to API and disables the button', async () => {
  renderPage()
  await screen.findByText(/showing 3 results/i)

  const card1 = screen.getByLabelText(/job 1/i)
  const invalidBtn = within(card1).getByRole('button', { name: /invalid/i })

  expect(invalidBtn).toBeEnabled()

  apiPostMock.mockResolvedValue({ data: {} })
  await userEvent.click(invalidBtn)

  expect(apiPostMock).toHaveBeenCalledWith('/api/job/companies/10/jobs/1/invalid')
  await waitFor(() => {
    expect(invalidBtn).toBeDisabled()
  })
})

test('invalid button is disabled for already invalid jobs', async () => {
  renderPage()
  await screen.findByText(/showing 3 results/i)

  const card2 = screen.getByLabelText(/job 2/i) // status: 1
  const btn2 = within(card2).getByRole('button', { name: /invalid/i })
  expect(btn2).toBeDisabled()

  const card3 = screen.getByLabelText(/job 3/i) // status: "invalid"
  const btn3 = within(card3).getByRole('button', { name: /invalid/i })
  expect(btn3).toBeDisabled()
})
