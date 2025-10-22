/* eslint-disable */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('../navigation.jsx', () => ({ default: () => <div data-testid="nav" /> }))

vi.mock('../../services/authService.js', () => ({
  getCurrentUser: () => ({ role: 1, fullName: 'HR Henry' }),
}))

const getCompanyIdMock = vi.fn()
vi.mock('../../services/hrService.js', () => ({
  getCompanyId: (...args) => getCompanyIdMock(...args),
}))

const apiPost = vi.fn()
vi.mock('../../services/api.js', () => ({
  __esModule: true,
  default: {
    post: (...args) => apiPost(...args),
  },
}))

import PostJob from './PostJob'

function renderPage(jsx = <PostJob />) {
  return render(<MemoryRouter>{jsx}</MemoryRouter>)
}

async function fillValidForm(overrides = {}) {
  const defaults = {
    title: 'Frontend Developer',
    employmentType: '1', // Full Time
    salaryMin: '3500',
    salaryMax: '6000',
  }
  const vals = { ...defaults, ...overrides }

  await userEvent.type(screen.getByLabelText(/Job Title/i), vals.title)
  await userEvent.selectOptions(screen.getByLabelText(/Employment Type/i), vals.employmentType)
  await userEvent.clear(screen.getByLabelText(/Min Salary/i))
  await userEvent.type(screen.getByLabelText(/Min Salary/i), vals.salaryMin)
  await userEvent.clear(screen.getByLabelText(/Max Salary/i))
  await userEvent.type(screen.getByLabelText(/Max Salary/i), vals.salaryMax)
  await userEvent.type(screen.getByLabelText(/Address/i), overrides.location ?? '1 Fusionopolis Way, Singapore')
  await userEvent.type(screen.getByLabelText(/Job Description/i), overrides.description ?? 'Great team and growth')
}

beforeEach(() => {
  vi.clearAllMocks()
  getCompanyIdMock.mockResolvedValue(42)
})

test('renders basic form', () => {
  renderPage()
  expect(screen.getByText(/Post Job Positions/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/Job Title/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/Employment Type/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/Min Salary/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/Max Salary/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/Address/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/Job Description/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Post Job Position/i })).toBeEnabled()
})

test('validation: required fields and type checks prevent submit', async () => {
  const onSubmit = vi.fn()
  renderPage(<PostJob onSubmit={onSubmit} />)


  await userEvent.click(screen.getByRole('button', { name: /Post Job Position/i }))


  expect(await screen.findByText(/Please enter the job name/i)).toBeInTheDocument()
  expect(screen.getByText(/Please choose a job type/i)).toBeInTheDocument()
  expect(screen.getByText(/Please enter min salary/i)).toBeInTheDocument()
  expect(screen.getByText(/Please enter max salary/i)).toBeInTheDocument()
  expect(screen.getByText(/Please fill in the job description/i)).toBeInTheDocument()
  expect(onSubmit).not.toHaveBeenCalled()
})

test('validation: salary range min <= max', async () => {
  const onSubmit = vi.fn()
  renderPage(<PostJob onSubmit={onSubmit} />)

  await userEvent.type(screen.getByLabelText(/Job Title/i), 'X')
  await userEvent.selectOptions(screen.getByLabelText(/Employment Type/i), '2')
  await userEvent.clear(screen.getByLabelText(/Min Salary/i))
  await userEvent.type(screen.getByLabelText(/Min Salary/i), '9000')
  await userEvent.clear(screen.getByLabelText(/Max Salary/i))
  await userEvent.type(screen.getByLabelText(/Max Salary/i), '1000')
  await userEvent.type(screen.getByLabelText(/Address/i), 'Somewhere')
  await userEvent.type(screen.getByLabelText(/Job Description/i), 'Desc')

  await userEvent.click(screen.getByRole('button', { name: /Post Job Position/i }))
  expect(await screen.findByText(/Min salary should not exceed max salary/i)).toBeInTheDocument()
  expect(screen.getByText(/Max salary should be ≥ min salary/i)).toBeInTheDocument()
  expect(onSubmit).not.toHaveBeenCalled()
})

test('submits via onSubmit prop with valid payload and shows submitting state', async () => {
  let resolveSubmit
  const submitPromise = new Promise((res) => (resolveSubmit = res))
  const onSubmit = vi.fn(() => submitPromise)
  renderPage(<PostJob onSubmit={onSubmit} />)

  await fillValidForm()
  const submitBtn = screen.getByRole('button', { name: /Post Job Position/i })
  await userEvent.click(submitBtn)

  expect(onSubmit).toHaveBeenCalledWith({
    title: 'Frontend Developer',
    location: '1 Fusionopolis Way, Singapore',
    employmentType: 1,
    salaryMin: 3500,
    salaryMax: 6000,
    description: 'Great team and growth',
  })

  expect(screen.getByRole('button', { name: /Posting…/i })).toBeDisabled()

  resolveSubmit()
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

test('submits via API when onSubmit is not provided (uses companyId from service)', async () => {
  getCompanyIdMock.mockResolvedValueOnce(7)
  apiPost.mockResolvedValueOnce({ data: { id: 123 } })

  renderPage() 
  await fillValidForm()
  await userEvent.click(screen.getByRole('button', { name: /Post Job Position/i }))

  await waitFor(() => {
    expect(apiPost).toHaveBeenCalledWith('/api/user/companies/7/jobs', {
      title: 'Frontend Developer',
      location: '1 Fusionopolis Way, Singapore',
      employmentType: 1,
      salaryMin: 3500,
      salaryMax: 6000,
      description: 'Great team and growth',
    })
  })
})

test('Reset clears fields and errors', async () => {
  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /Post Job Position/i }))
  expect(await screen.findByText(/Please enter the job name/i)).toBeInTheDocument()

  await userEvent.type(screen.getByLabelText(/Job Title/i), 'ABC')
  await userEvent.type(screen.getByLabelText(/Address/i), 'SG')

  await userEvent.click(screen.getByRole('button', { name: /Reset/i }))

  expect(screen.getByLabelText(/Job Title/i)).toHaveValue('')
  expect(screen.getByLabelText(/Address/i)).toHaveValue('')

  expect(screen.queryByText(/Please enter the job name/i)).not.toBeInTheDocument()
})
