/* eslint-disable */
import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

beforeAll(() => {
  const CSSDecl = globalThis.CSSStyleDeclaration ?? window?.CSSStyleDeclaration
  if (!CSSDecl || !CSSDecl.prototype) return
  const proto = CSSDecl.prototype


  const originalSetProperty = proto.setProperty?.bind(proto)
  if (originalSetProperty) {
    proto.setProperty = function (prop, value, priority) {
      try {
        if (typeof value === 'string' && value.includes('var(')) return
        return originalSetProperty(prop, value, priority)
      } catch {
        return
      }
    }
  }

  const desc = Object.getOwnPropertyDescriptor(proto, 'cssText')
  if (desc?.set) {
    Object.defineProperty(proto, 'cssText', {
      ...desc,
      set(v) {
        try {
          if (typeof v === 'string' && v.includes('var(')) {
            v = v.replace(/var\([^)]*\)/g, '#ccc')
          }
          return desc.set.call(this, v)
        } catch {
          return
        }
      },
    })
  }
})

import CheckApplication from './checkApplication'

vi.mock('../navigation.jsx', () => ({ default: () => <div data-testid="nav" /> }))

vi.mock('../../services/authService', () => ({
  getCurrentUser: () => ({ role: 1, fullName: 'HR Henry' }),
}))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom')
  return { ...real, useNavigate: () => navigateMock }
})

// API
const apiGetMock = vi.fn()
vi.mock('../../services/api.js', () => ({
  __esModule: true,
  default: {
    get: (...args) => apiGetMock(...args),
  },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <CheckApplication />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

const apps = [
  {
    id: 1,
    jobId: 100,
    jobTitle: 'Frontend Dev',
    applicantName: 'Alice',
    status: 0, // Submitted
    appliedAt: '2025-09-20T10:00:00Z',
  },
  {
    id: 2,
    jobId: 101,
    jobTitle: 'Data Analyst',
    applicantName: 'Bob',
    status: 2, // Passed
    appliedAt: '2025-09-22T09:00:00Z',
  },
  {
    id: 3,
    jobId: 102,
    jobTitle: 'Backend Eng',
    applicantName: 'Carol',
    status: 3, // Rejected
    appliedAt: '2025-09-21T12:00:00Z',
  },
  {
    id: 4,
    jobId: 103,
    jobTitle: 'Designer',
    applicantName: 'Dave',
    status: 4, // Invalid
    appliedAt: '2025-09-19T08:00:00Z',
  },
]

function mockListOk(list = apps) {
  apiGetMock.mockImplementation((url, config) => {
    if (url === '/api/application/applications') {
      expect(config?.params).toMatchObject({ page: 0, size: 50 })
      return Promise.resolve({ data: { content: list } })
    }
    return Promise.resolve({ data: {} })
  })
}

test('loads, shows count, sorted by appliedAt desc, and renders fields', async () => {
  mockListOk()
  renderPage()

  await waitFor(() => {
    expect(apiGetMock).toHaveBeenCalledWith('/api/application/applications', { params: { page: 0, size: 50 } })
  })

  expect(await screen.findByText(/Showing 4 results/i)).toBeInTheDocument()

  const articles = screen.getAllByRole('article')
  // Sorted desc -> newest first: id=2
  expect(within(articles[0]).getByText(/Data Analyst/i)).toBeInTheDocument()
  expect(within(articles[1]).getByText(/Backend Eng/i)).toBeInTheDocument()
  expect(within(articles[2]).getByText(/Frontend Dev/i)).toBeInTheDocument()
  expect(within(articles[3]).getByText(/Designer/i)).toBeInTheDocument()

  // Status lines
  expect(screen.getByText(/Status:\s*Submitted/i)).toBeInTheDocument()
  expect(screen.getByText(/Status:\s*Passed/i)).toBeInTheDocument()
  expect(screen.getByText(/Status:\s*Rejected/i)).toBeInTheDocument()
  expect(screen.getByText(/Status:\s*Invalid/i)).toBeInTheDocument()
})

test('keyword search filters by job title / applicant / id / jobId', async () => {
  mockListOk()
  renderPage()
  await screen.findByText(/Showing 4 results/i)

  const input = screen.getByPlaceholderText(/Search: Job Title \/ Applicant \/ ID \/ JobId/i)

  // applicant
  await userEvent.clear(input)
  await userEvent.type(input, 'alice')
  expect(screen.getByText(/Showing 1 result/i)).toBeInTheDocument()
  expect(screen.getByText(/Frontend Dev/i)).toBeInTheDocument()

  // job title
  await userEvent.clear(input)
  await userEvent.type(input, 'backend')
  expect(screen.getByText(/Showing 1 result/i)).toBeInTheDocument()
  expect(screen.getByText(/Backend Eng/i)).toBeInTheDocument()

  // id
  await userEvent.clear(input)
  await userEvent.type(input, '4')
  expect(screen.getByText(/Showing 1 result/i)).toBeInTheDocument()
  expect(screen.getByText(/Designer/i)).toBeInTheDocument()

  // Reset
  await userEvent.click(screen.getByRole('button', { name: /Reset/i }))
  expect(screen.getByText(/Showing 4 results/i)).toBeInTheDocument()
})

test('status filter works and Reset restores all', async () => {
  mockListOk([
    { ...apps[0], status: 0 },
    { ...apps[1], status: 1, jobTitle: 'ML Engineer', applicantName: 'Bea' },
    { ...apps[2], status: 2, jobTitle: 'Support', applicantName: 'Carl' },
    { ...apps[3], status: 3, jobTitle: 'Ops', applicantName: 'Dina' },
    { id: 5, jobId: 104, jobTitle: 'QA', applicantName: 'Eve', status: 4, appliedAt: '2025-09-18T00:00:00Z' },
  ])

  renderPage()
  await screen.findByText(/Showing 5 results/i)

  const select = screen.getByLabelText(/Status filter/i)

  await userEvent.selectOptions(select, '0')
  await screen.findByText(/Showing 1 result/i)
  expect(screen.getByText(/Frontend Dev/i)).toBeInTheDocument()

  await userEvent.selectOptions(select, '1')
  await screen.findByText(/Showing 1 result/i)
  expect(screen.getByText(/ML Engineer/i)).toBeInTheDocument()

  await userEvent.selectOptions(select, '2')
  await screen.findByText(/Showing 1 result/i)
  expect(screen.getByText(/Support/i)).toBeInTheDocument()

  await userEvent.selectOptions(select, '3')
  await screen.findByText(/Showing 1 result/i)
  expect(screen.getByText(/Ops/i)).toBeInTheDocument()

  await userEvent.selectOptions(select, '4')
  await screen.findByText(/Showing 1 result/i)
  expect(screen.getByText(/QA/i)).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /Reset/i }))
  await screen.findByText(/Showing 5 results/i)
})

test('Manage button navigates to detail with state id', async () => {
  mockListOk()
  renderPage()
  await screen.findByText(/Showing 4 results/i)

  const firstCard = screen.getByLabelText(/Application 2/i) // newest first
  const manageBtn = within(firstCard).getByRole('button', { name: /Manage/i })
  await userEvent.click(manageBtn)

  expect(navigateMock).toHaveBeenCalledWith('/hr/applications/applicationDetail', { state: { id: 2 } })
})

test('403 error shows fallback alert and clears list', async () => {
  apiGetMock.mockRejectedValueOnce({ response: { status: 403, data: {} } }) // no message -> fallback used

  renderPage()

  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent(/No permission/i)
  expect(screen.getByText(/Showing 0 results/i)).toBeInTheDocument()
  expect(screen.getByText(/No applications found\./i)).toBeInTheDocument()
})
