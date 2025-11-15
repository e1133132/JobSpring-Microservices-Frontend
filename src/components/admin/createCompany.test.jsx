/* eslint-disable */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import CreateCompany from './createCompany'

beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'mocked-object-url')
})

vi.mock('../navigation.jsx', () => ({ default: () => <div data-testid="nav" /> }))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom')
  return { ...real, useNavigate: () => navigateMock }
})

vi.mock('../../services/authService', () => ({
  getCurrentUser: () => ({ role: 2, fullName: 'Alice Admin' }),
}))

const apiPostMock = vi.fn()
vi.mock('../../services/api.js', () => ({
  __esModule: true,
  default: {
    post: (...args) => apiPostMock(...args),
  },
}))

const swalFireMock = vi.fn().mockResolvedValue({})
vi.mock('sweetalert2', () => ({
  __esModule: true,
  default: { fire: (...args) => swalFireMock(...args) },
}))

function renderPage() {
  return render(
      <MemoryRouter>
        <CreateCompany />
      </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

test('renders Create Company form fields', () => {
  renderPage()
  expect(screen.getByText(/Create Company/i)).toBeInTheDocument()
  expect(screen.getByText(/Name/i)).toBeInTheDocument()
  expect(screen.getByText(/Website/i)).toBeInTheDocument()
  expect(screen.getByText(/Logo/i)).toBeInTheDocument()
  expect(screen.getByText(/Description/i)).toBeInTheDocument()
})

test('shows validation error if name is missing', async () => {
  renderPage()
  await userEvent.click(screen.getByRole('button', { name: /create/i }))
  expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
  expect(apiPostMock).not.toHaveBeenCalled()
})

test('rejects invalid website URL', async () => {
  renderPage()
  await userEvent.type(screen.getByPlaceholderText(/acme inc/i), 'Test Co')
  await userEvent.type(screen.getByPlaceholderText(/example.com/i), 'not-a-url')
  await userEvent.click(screen.getByRole('button', { name: /create/i }))

  await waitFor(() => {
    expect(apiPostMock).not.toHaveBeenCalled()
  })
})

test('submits valid data and shows success message', async () => {
  renderPage()
  apiPostMock.mockResolvedValueOnce({ data: { id: 99 } })

  await userEvent.type(screen.getByPlaceholderText(/acme inc/i), 'Alpha Ltd')
  await userEvent.type(screen.getByPlaceholderText(/example.com/i), 'https://alpha.com')
  await userEvent.type(
      screen.getByPlaceholderText(/short description/i),
      'This is a test company'
  )

  const submitBtn = screen.getByRole('button', { name: /create/i })
  await userEvent.click(submitBtn)

  await waitFor(() => {
    expect(apiPostMock).toHaveBeenCalledWith(
        '/api/company/create',
        expect.any(FormData),
        expect.any(Object)
    )
  })
  await waitFor(() => {
    expect(swalFireMock).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'success', title: 'Company created' })
    )
  })
})

test('handles backend failure gracefully', async () => {
  renderPage()
  apiPostMock.mockRejectedValueOnce({ response: { data: { message: 'Server error' } } })

  await userEvent.type(screen.getByPlaceholderText(/acme inc/i), 'Fail Co')
  await userEvent.click(screen.getByRole('button', { name: /create/i }))

  await waitFor(() => {
    expect(swalFireMock).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'error', title: 'Failed' })
    )
  })
})

test('reset button clears all fields', async () => {
  renderPage()
  const nameInput = screen.getByPlaceholderText(/acme inc/i)
  await userEvent.type(nameInput, 'Temp Co')

  const resetBtn = screen.getByRole('button', { name: /reset/i })
  await userEvent.click(resetBtn)

  expect(nameInput.value).toBe('')
})

test('back button navigates -1', async () => {
  renderPage()
  const backBtn = screen.getByRole('button', { name: /back/i })
  await userEvent.click(backBtn)
  expect(navigateMock).toHaveBeenCalledWith(-1)
})

test('displays selected image preview when a logo file is chosen', async () => {
  renderPage()
  const input = document.querySelector('input[type="file"]')
  const file = new File(['(⌐□_□)'], 'logo.png', { type: 'image/png' })

  await userEvent.upload(input, file)

  expect(input.files[0]).toBe(file)
  expect(input.files).toHaveLength(1)
  expect(global.URL.createObjectURL).toHaveBeenCalled()
})
