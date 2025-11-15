/* eslint-disable */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

const { swalFire } = vi.hoisted(() => ({ swalFire: vi.fn().mockResolvedValue({}) }))
vi.mock('sweetalert2', () => ({ __esModule: true, default: { fire: swalFire } }))

vi.mock('../navigation.jsx', () => ({ default: () => <div data-testid="nav" /> }))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom')
  return {
    ...real,
    useNavigate: () => navigateMock,
    useLocation: () => ({ state: { id: 101 } }),
  }
})

vi.mock('../../services/authService', () => ({
  getCurrentUser: () => ({ role: 1, fullName: 'HR Henry' }),
}))

const apiGet = vi.fn()
const apiPost = vi.fn()
vi.mock('../../services/api.js', () => ({
  __esModule: true,
  default: {
    get: (...args) => apiGet(...args),
    post: (...args) => apiPost(...args),
  },
}))

beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:resume-url')
})

beforeEach(() => {
  vi.clearAllMocks()
  apiGet.mockImplementation((url) => {
    if (url === '/api/application/101') {
      return Promise.resolve({
        data: {
          id: 101,
          jobTitle: 'Senior Frontend Engineer',
          applicantName: 'Jane Doe',
          applicantEmail: 'jane@example.com',
          appliedAt: '2025-09-25T08:00:00Z',
          status: 0, // Pending
          resumeFileId: 'file-abc',
        },
      })
    }
    if (url.startsWith('/api/application/download/')) {
      return Promise.resolve({ data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }) })
    }
    return Promise.resolve({ data: {} })
  })
})

import ApplicationDetail from './applicationDetails' 

function renderPage() {
  return render(
    <MemoryRouter>
      <ApplicationDetail />
    </MemoryRouter>
  )
}

test('loads application, shows meta & status chip, renders blob preview with download link', async () => {
  renderPage()

  await waitFor(() => {
    expect(apiGet).toHaveBeenCalledWith('/api/application/101')
  })

  expect(await screen.findByText(/Application #101/i)).toBeInTheDocument()
  expect(screen.getByText(/Senior Frontend Engineer/i)).toBeInTheDocument()
  expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'jane@example.com' })).toHaveAttribute(
    'href',
    'mailto:jane@example.com'
  )
  expect(screen.getByText(/Pending/i)).toBeInTheDocument()

  await waitFor(() => {
    expect(apiGet).toHaveBeenCalledWith('/api/application/download/file-abc', { responseType: 'blob' })
  })

  const iframe = screen.getByTitle('resume-pdf')
  expect(iframe).toBeInTheDocument()
  expect(iframe).toHaveAttribute('src', expect.stringContaining('blob:resume-url'))

  const downloadLink = screen.getByRole('link', { name: /download resume/i })
  expect(downloadLink).toHaveAttribute('href', 'blob:resume-url')
})

test('download failure shows "No Document"', async () => {
  apiGet.mockImplementation((url) => {
    if (url === '/api/application/101') {
      return Promise.resolve({
        data: {
          id: 101,
          jobTitle: 'Data Analyst',
          applicantName: 'John Roe',
          applicantEmail: 'john@example.com',
          appliedAt: '2025-09-21T12:00:00Z',
          status: 0,
          resumeFileId: 'file-bad',
        },
      })
    }
    if (url.startsWith('/api/application/download/')) {
      return Promise.reject(new Error('download error'))
    }
    return Promise.resolve({ data: {} })
  })

  renderPage()
  await screen.findByText(/Application #101/i)
  expect(await screen.findByText(/No Document/i)).toBeInTheDocument()
})

test('clicking Pass and Reject posts status updates and shows success alerts', async () => {
  apiPost.mockResolvedValue({ data: {} })

  renderPage()
  await screen.findByText(/Application #101/i)

  const passBtn = screen.getByRole('button', { name: /Pass/i })
  const rejectBtn = screen.getByRole('button', { name: /Reject/i })

  await userEvent.click(passBtn)
  expect(apiPost).toHaveBeenCalledWith('/api/application/applications/101/status', { status: 2 })
  await waitFor(() => {
    expect(swalFire).toHaveBeenCalledWith('Success', 'Application status passed', 'success')
  })

  await userEvent.click(rejectBtn)
  expect(apiPost).toHaveBeenCalledWith('/api/application/applications/101/status', { status: 3 })
  await waitFor(() => {
    expect(swalFire).toHaveBeenCalledWith('Success', 'Application status rejected', 'success')
  })
})

test('Pass disabled when status = Approved', async () => {
  apiGet.mockImplementation((url) => {
    if (url === '/api/application/101') {
      return Promise.resolve({
        data: {
          id: 101,
          jobTitle: 'Ops',
          applicantName: 'Foo',
          applicantEmail: 'foo@example.com',
          appliedAt: '2025-09-23T00:00:00Z',
          status: 2, // Approved
          resumeFileId: 'file-ok',
        },
      })
    }
    if (url.startsWith('/api/application/download/')) {
      return Promise.resolve({ data: new Blob(['pdf'], { type: 'application/pdf' }) })
    }
    return Promise.resolve({ data: {} })
  })

  renderPage()
  await screen.findByText(/Application #101/i)

  expect(screen.getByText(/Approved/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Pass/i })).toBeDisabled()
  expect(screen.getByRole('button', { name: /Reject/i })).toBeEnabled()
})

test('Reject disabled when status = Rejected', async () => {
  apiGet.mockImplementation((url) => {
    if (url === '/api/application/101') {
      return Promise.resolve({
        data: {
          id: 101,
          jobTitle: 'Ops',
          applicantName: 'Bar',
          applicantEmail: 'bar@example.com',
          appliedAt: '2025-09-24T00:00:00Z',
          status: 3, // Rejected
          resumeFileId: 'file-ok',
        },
      })
    }
    if (url.startsWith('/api/application/download/')) {
      return Promise.resolve({ data: new Blob(['pdf'], { type: 'application/pdf' }) })
    }
    return Promise.resolve({ data: {} })
  })

  renderPage()
  await screen.findByText(/Application #101/i)

  expect(screen.getByText(/Rejected/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Pass/i })).toBeEnabled()
  expect(screen.getByRole('button', { name: /Reject/i })).toBeDisabled()
})

test('Back button navigates to /hr/applications', async () => {
  renderPage();
  await screen.findByText(/Application #101/i);

  await userEvent.click(screen.getByRole('button', { name: /Back/i }));

  expect(navigateMock).toHaveBeenCalledWith('/hr/applications', { replace: true });
});

