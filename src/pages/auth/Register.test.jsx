/* eslint-disable */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import Register from './Register'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom')
  return { ...real, useNavigate: () => navigateMock }
})

vi.mock('../../assets/jobspringt.png', () => ({ default: 'logo.png' }), { virtual: true })
vi.mock('../../App.css', () => ({}), { virtual: true })

const sendCodeMock = vi.fn()
const registerMock = vi.fn()
vi.mock('../../services/authService', () => ({
  sendVerificationCode: (...args) => sendCodeMock(...args),
  register: (...args) => registerMock(...args),
}))

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

test('click "Send Code" without email shows field error and does not call API', async () => {
  renderRegister()

  await userEvent.click(screen.getByRole('button', { name: /send code/i }))

  expect(await screen.findByText(/this field is required/i)).toBeInTheDocument()
  expect(sendCodeMock).not.toHaveBeenCalled()
})

test('send code success: calls API and button enters cooldown', async () => {
  renderRegister()

  await userEvent.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
  sendCodeMock.mockResolvedValue({})

  await userEvent.click(screen.getByRole('button', { name: /send code/i }))

  await waitFor(() => {
    expect(sendCodeMock).toHaveBeenCalledWith('test@example.com')
  })

  const cooldownBtn = await screen.findByRole('button', { name: /resend \(\d+\)/i })
  expect(cooldownBtn).toBeDisabled()
})

test('register success navigates to /auth/login', async () => {
  renderRegister()

  await userEvent.type(screen.getByPlaceholderText(/full name/i), 'Alice')
  await userEvent.type(screen.getByPlaceholderText(/^email$/i), 'alice@example.com')
  await userEvent.type(screen.getByPlaceholderText(/verification code/i), '123456')
  await userEvent.type(screen.getByPlaceholderText(/^password$/i), 'pw12345')

  registerMock.mockResolvedValue({})

  await userEvent.click(screen.getByRole('button', { name: /^register$/i }))

  await waitFor(() => {
    expect(registerMock).toHaveBeenCalledWith({
      fullName: 'Alice',
      email: 'alice@example.com',
      code: '123456',
      password: 'pw12345',
    })
    expect(navigateMock).toHaveBeenCalledWith('/auth/login')
  })
})

test('register failure shows backend message', async () => {
  renderRegister()

  await userEvent.type(screen.getByPlaceholderText(/full name/i), 'Bob')
  await userEvent.type(screen.getByPlaceholderText(/^email$/i), 'bob@example.com')
  await userEvent.type(screen.getByPlaceholderText(/verification code/i), '654321')
  await userEvent.type(screen.getByPlaceholderText(/^password$/i), 'pw12345')

  registerMock.mockRejectedValue({
    response: { data: { message: 'Email already exists' } },
  })

  await userEvent.click(screen.getByRole('button', { name: /^register$/i }))

  expect(await screen.findByText(/email already exists/i)).toBeInTheDocument()
  expect(navigateMock).not.toHaveBeenCalled()
})

test('register failure shows default message on generic error', async () => {
  renderRegister()

  await userEvent.type(screen.getByPlaceholderText(/full name/i), 'Carl')
  await userEvent.type(screen.getByPlaceholderText(/^email$/i), 'carl@example.com')
  await userEvent.type(screen.getByPlaceholderText(/verification code/i), '111111')
  await userEvent.type(screen.getByPlaceholderText(/^password$/i), 'pw12345')

  registerMock.mockRejectedValue(new Error('network'))

  await userEvent.click(screen.getByRole('button', { name: /^register$/i }))

  expect(await screen.findByText(/register failed/i)).toBeInTheDocument()
  expect(navigateMock).not.toHaveBeenCalled()
})
