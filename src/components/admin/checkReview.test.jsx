/* eslint-disable */
import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import CheckReview from './checkReview'


vi.mock('../navigation.jsx', () => ({ default: () => <div data-testid="nav" /> }))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom')
  return { ...real, useNavigate: () => navigateMock }
})

vi.mock('../../services/authService', () => ({
  getCurrentUser: () => ({ role: 2, fullName: 'Alice Admin' }),
}))

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
      <CheckReview />
    </MemoryRouter>
  )
}

const reviews = [
  {
    id: 1,
    title: 'Great culture',
    content: 'Loved the team',
    status: 0, // pending
    rating: 5,
    applicationId: 101,
    submittedAt: '2025-09-20T12:00:00Z',
  },
  {
    id: 2,
    title: 'So-so experience',
    content: 'Average',
    status: 1, // passed
    rating: 3,
    applicationId: 102,
    submittedAt: '2025-09-21T08:00:00Z',
  },
  {
    id: 3,
    title: 'Bad interview',
    content: 'Interviewer was late',
    status: 2, // rejected
    rating: 1,
    applicationId: 103,
    submittedAt: '2025-09-22T09:30:00Z',
  },
  {
    id: 4,
    title: 'Nice office',
    content: 'Bright and clean',
    status: 0, // pending
    rating: 4,
    applicationId: 104,
    submittedAt: '2025-09-23T09:30:00Z',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  apiGetMock.mockResolvedValue({ data: reviews })
})

test('loads and shows list summary + items', async () => {
  renderPage()


  expect(await screen.findByRole('heading', { name: /reviews/i })).toBeInTheDocument()


  expect(await screen.findByText(/showing 4 results/i)).toBeInTheDocument()


  expect(screen.getByText(/great culture/i)).toBeInTheDocument()
  expect(screen.getByText(/so-so experience/i)).toBeInTheDocument()
  expect(screen.getByText(/bad interview/i)).toBeInTheDocument()
  expect(screen.getByText(/nice office/i)).toBeInTheDocument()
})

test('text search filters results', async () => {
  renderPage()
  await screen.findByText(/showing 4 results/i)

  const input = screen.getByPlaceholderText(/input title \/ content \/ id \/ applicationid \/ rating to search/i)
  await userEvent.type(input, 'office')

  expect(screen.getByText(/showing 1 result/i)).toBeInTheDocument()
  expect(screen.getByText(/nice office/i)).toBeInTheDocument()
  expect(screen.queryByText(/great culture/i)).not.toBeInTheDocument()
})

test('status filter works (passed / rejected / pending / reset)', async () => {
  renderPage()
  await screen.findByText(/showing 4 results/i)

  const select = screen.getByLabelText(/status filter/i)


  await userEvent.selectOptions(select, 'passed')
  await userEvent.tab()
  expect(screen.getByText(/showing 1 result/i)).toBeInTheDocument()
  expect(screen.getByText(/so-so experience/i)).toBeInTheDocument()
  expect(screen.queryByText(/great culture/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/bad interview/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/nice office/i)).not.toBeInTheDocument()

  // rejected
  await userEvent.selectOptions(select, 'rejected')
  expect(screen.getByText(/showing 1 result/i)).toBeInTheDocument()
  expect(screen.getByText(/bad interview/i)).toBeInTheDocument()

  // pending
  await userEvent.selectOptions(select, 'pending')
  expect(screen.getByText(/showing 2 results/i)).toBeInTheDocument()
  expect(screen.getByText(/great culture/i)).toBeInTheDocument()
  expect(screen.getByText(/nice office/i)).toBeInTheDocument()

  // reset
  await userEvent.click(screen.getByRole('button', { name: /reset/i }))
  expect(screen.getByText(/showing 4 results/i)).toBeInTheDocument()
})

test('click "pass" calls API, shows busy state, then updates to passed and hides actions', async () => {
  renderPage()
  await screen.findByText(/showing 4 results/i)

  const card = screen.getByLabelText(/review 1/i)
  const passBtn = within(card).getByRole('button', { name: /pass/i })

  let resolvePost
  const postPromise = new Promise((res) => (resolvePost = res))
  apiPostMock.mockReturnValueOnce(postPromise)

  await userEvent.click(passBtn)

  expect(within(card).getByRole('button', { name: /passing…/i })).toHaveAttribute('aria-busy', 'true')

  expect(apiPostMock).toHaveBeenCalledWith('/api/admin/review/pass/1', { note: '' }, { headers: { 'Content-Type': 'application/json' } })

  resolvePost({ data: {} })

  await waitFor(() => {
    expect(within(card).getByText(/status:\s*passed/i)).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: /pass/i })).not.toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: /reject/i })).not.toBeInTheDocument()
  })
})

test('click "reject" calls API, shows busy state, then updates to rejected and hides actions', async () => {
  renderPage()
  await screen.findByText(/showing 4 results/i)

  const card = screen.getByLabelText(/review 4/i)
  const rejectBtn = within(card).getByRole('button', { name: /reject/i })

  let resolvePost
  const postPromise = new Promise((res) => (resolvePost = res))
  apiPostMock.mockReturnValueOnce(postPromise)

  await userEvent.click(rejectBtn)

  expect(within(card).getByRole('button', { name: /rejecting…/i })).toHaveAttribute('aria-busy', 'true')

  expect(apiPostMock).toHaveBeenCalledWith('/api/admin/review/reject/4', { note: '' }, { headers: { 'Content-Type': 'application/json' } })

  resolvePost({ data: {} })

  await waitFor(() => {
    expect(within(card).getByText(/status:\s*rejected/i)).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: /pass/i })).not.toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: /reject/i })).not.toBeInTheDocument()
  })
})

test('click "Review Detail" navigates with state { id }', async () => {
  renderPage()
  await screen.findByText(/showing 4 results/i)

  const card = screen.getByLabelText(/review 2/i)
  const detailBtn = within(card).getByRole('button', { name: /review detail/i })
  await userEvent.click(detailBtn)

  expect(navigateMock).toHaveBeenCalledWith('/admin/audit/reviewDetail', { state: { id: 2 } })
})
