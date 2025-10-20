/* eslint-disable */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import Login from './Login'

// ---- Mocks ----
const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom')
  return { ...real, useNavigate: () => navigateMock }
})

vi.mock('../../assets/jobspringt.png', () => ({ default: 'logo.png' }), { virtual: true })
vi.mock('../../App.css', () => ({}), { virtual: true })

const loginMock = vi.fn()
vi.mock('../../services/authService', () => ({
  login: (...args) => loginMock(...args),
}))


function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

test('role 2 (Admin) navigates to /admin/status', async () => {
  renderLogin()

  await userEvent.type(screen.getByPlaceholderText(/email/i), 'admin@example.com')
  await userEvent.type(screen.getByPlaceholderText(/password/i), 'pw12345')

  loginMock.mockResolvedValue({
    token: 't',
    user: { role: 2, fullName: 'Admin' },
  })

  await userEvent.click(screen.getByRole('button', { name: /login/i }))

  await waitFor(() => {
    expect(loginMock).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'pw12345' })
    expect(navigateMock).toHaveBeenCalledWith('/admin/status')
  })
})

test('role 1 (HR) navigates to /hr/JobPosition', async () => {
  renderLogin()

  await userEvent.type(screen.getByPlaceholderText(/email/i), 'hr@example.com')
  await userEvent.type(screen.getByPlaceholderText(/password/i), 'pw12345')

  loginMock.mockResolvedValue({
    token: 't',
    user: { role: 1, fullName: 'HR' },
  })

  await userEvent.click(screen.getByRole('button', { name: /login/i }))

  await waitFor(() => {
    expect(navigateMock).toHaveBeenCalledWith('/hr/JobPosition')
  })
})

test('role 0 (Candidate) navigates to /home', async () => {
  renderLogin()

  await userEvent.type(screen.getByPlaceholderText(/email/i), 'u@example.com')
  await userEvent.type(screen.getByPlaceholderText(/password/i), 'pw12345')

  loginMock.mockResolvedValue({
    token: 't',
    user: { role: 0, fullName: 'User' },
  })

  await userEvent.click(screen.getByRole('button', { name: /login/i }))

  await waitFor(() => {
    expect(navigateMock).toHaveBeenCalledWith('/home')
  })
})

test('shows backend error message on failure (Invalid credentials)', async () => {
  renderLogin()

  await userEvent.type(screen.getByPlaceholderText(/email/i), 'u@example.com')
  await userEvent.type(screen.getByPlaceholderText(/password/i), 'pw12345')

  loginMock.mockRejectedValue({
    response: { data: { message: 'Invalid credentials' } },
  })

  await userEvent.click(screen.getByRole('button', { name: /login/i }))

  expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument()
  expect(navigateMock).not.toHaveBeenCalled()
})

test('shows default message on generic error', async () => {
  renderLogin()

  await userEvent.type(screen.getByPlaceholderText(/email/i), 'u@example.com')
  await userEvent.type(screen.getByPlaceholderText(/password/i), 'pw12345')

  loginMock.mockRejectedValue(new Error('network'))

  await userEvent.click(screen.getByRole('button', { name: /login/i }))

  expect(await screen.findByText(/login failed/i)).toBeInTheDocument()
  expect(navigateMock).not.toHaveBeenCalled()
})

test('cannot submit when password too short (button disabled)', async () => {
  renderLogin()

  await userEvent.type(screen.getByPlaceholderText(/email/i), 'u@example.com')
  await userEvent.type(screen.getByPlaceholderText(/password/i), 'pw12') 
  await userEvent.tab()
  const submit = screen.getByRole('button', { name: /login/i })
  expect(submit).toBeDisabled()
})
