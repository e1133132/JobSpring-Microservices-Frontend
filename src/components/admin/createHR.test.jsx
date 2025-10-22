/* eslint-disable */
import React from 'react'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import CreateHR from './createHR'

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

const swalFireMock = vi.fn().mockResolvedValue({})
vi.mock('sweetalert2', () => ({
  __esModule: true,
  default: { fire: (...args) => swalFireMock(...args) },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateHR />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

const usersPayload = [
  { id: 1, full_name: 'Bob', email: 'bob@example.com', phone: '123', role: 0 },
  { id: 2, fullName: 'Helen', emailAddress: 'helen@corp.com', role: 'hr' },
  { uid: 3, name: 'Adam', phoneNumber: '999', role: 2 },
]

const companiesPayload = {
  data: {
    content: [
      { id: 101, name: 'Acme' },
      { id: 202, name: 'Beta' },
    ],
  },
}

function mockUserSearchOk(list = usersPayload) {
  apiGetMock.mockImplementation((url) => {
    if (url === '/api/user/search_user') {
      return Promise.resolve({ data: { content: list } })
    }
    if (url === '/api/company/list') {
      return Promise.resolve(companiesPayload)
    }
    return Promise.resolve({ data: {} })
  })
}

test('empty search does not call API; normal search shows user cards and role pills', async () => {
  renderPage()

  const searchBtn = screen.getByRole('button', { name: /search/i })
  await userEvent.click(searchBtn)
  expect(apiGetMock).not.toHaveBeenCalled()

  mockUserSearchOk()
  await userEvent.type(screen.getByPlaceholderText(/search by email \/ full_name \/ phone \/ id/i), 'bob')
  await userEvent.click(searchBtn)

  await waitFor(() => {
    expect(apiGetMock).toHaveBeenCalledWith('/api/user/search_user', { params: { q: 'bob' } })
  })

  expect(await screen.findByText('Bob')).toBeInTheDocument()
  expect(screen.getByText('Helen')).toBeInTheDocument()
  expect(screen.getByText('Adam')).toBeInTheDocument()

  const u1 = screen.getByText('Bob').closest('article')
  expect(within(u1).getByText(/job seeker/i)).toBeInTheDocument()

  const u2 = screen.getByText('Helen').closest('article')
  expect(within(u2).getByText(/^HR$/i)).toBeInTheDocument()

  const u3 = screen.getByText('Adam').closest('article')
  expect(within(u3).getByText(/admin/i)).toBeInTheDocument()
})

test('creating HR without selecting a company shows warning and does not POST', async () => {
  renderPage()
  mockUserSearchOk([{ id: 1, full_name: 'Bob', role: 0 }])

  await userEvent.type(screen.getByPlaceholderText(/search by email/i), 'bob')
  await userEvent.click(screen.getByRole('button', { name: /search/i }))
  await screen.findByText('Bob')

  const card = screen.getByText('Bob').closest('article')
  const createBtn = within(card).getByRole('button', { name: /create hr/i })

  await userEvent.click(createBtn)

  expect(swalFireMock).toHaveBeenCalledWith(
    expect.objectContaining({
      icon: 'warning',
      title: 'Please select company first',
    })
  )
  expect(apiPostMock).not.toHaveBeenCalled()
})

test('open company picker, load companies, select company, create HR success updates role/button', async () => {
  renderPage()
  mockUserSearchOk([{ id: 1, full_name: 'Bob', role: 0 }])

  await userEvent.type(screen.getByPlaceholderText(/search by email/i), 'bob')
  await userEvent.click(screen.getByRole('button', { name: /search/i }))
  await screen.findByText('Bob')

  const card = screen.getByText('Bob').closest('article')

  const bindBtn = within(card).getByRole('button', { name: /bind company/i })
  await userEvent.click(bindBtn)

  await waitFor(() => {
    expect(apiGetMock).toHaveBeenCalledWith('/api/company/list')
  })

  const select = within(card).getByRole('combobox')
  await userEvent.selectOptions(select, '202')

  apiPostMock.mockResolvedValue({ data: {} })
  await userEvent.click(within(card).getByRole('button', { name: /^create hr$/i }))

  expect(apiPostMock).toHaveBeenCalledWith('/api/user/1/make-hr', { companyId: 202 })

  await waitFor(() => {
    expect(swalFireMock).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'success', title: 'Succeeded' })
    )
  })

  expect(within(card).getByText(/^HR$/i)).toBeInTheDocument()
  const btnAfter = within(card).getByRole('button', { name: /already hr/i })
  expect(btnAfter).toBeDisabled()
})

test('already HR user has disabled "Already HR" button', async () => {
  renderPage()
  mockUserSearchOk([{ id: 2, fullName: 'Helen', email: 'helen@corp.com', role: 'hr' }])

  await userEvent.type(screen.getByPlaceholderText(/search by email/i), 'helen')
  await userEvent.click(screen.getByRole('button', { name: /search/i }))

  const card = await screen.findByText('Helen')
  const btn = within(card.closest('article')).getByRole('button', { name: /already hr/i })
  expect(btn).toBeDisabled()
})

test('shows "No results." when search returns empty', async () => {
  renderPage()
  mockUserSearchOk([])

  await userEvent.type(screen.getByPlaceholderText(/search by email/i), 'zzz')
  await userEvent.click(screen.getByRole('button', { name: /search/i }))

  expect(await screen.findByText(/no results\./i)).toBeInTheDocument()
})

test('shows backend error message on search failure', async () => {
  renderPage()
  apiGetMock.mockRejectedValueOnce({ response: { data: { message: 'Boom' } } })

  await userEvent.type(screen.getByPlaceholderText(/search by email/i), 'x')
  await userEvent.click(screen.getByRole('button', { name: /search/i }))

  expect(await screen.findByText(/boom/i)).toBeInTheDocument()
})

test('pressing Enter triggers search via window keydown listener', async () => {
  renderPage()
  mockUserSearchOk([{ id: 9, full_name: 'Key User', role: 0 }])

  await userEvent.type(screen.getByPlaceholderText(/search by email/i), 'key')
  fireEvent.keyDown(window, { key: 'Enter' })

  expect(await screen.findByText(/key user/i)).toBeInTheDocument()
})

test('Back button navigates -1; "Create one" link navigates to company creation page', async () => {
  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /back/i }))
  expect(navigateMock).toHaveBeenCalledWith(-1)

  const link = screen.getByText(/create one/i)
  await userEvent.click(link)
  expect(navigateMock).toHaveBeenCalledWith('/admin/create/company')
})
