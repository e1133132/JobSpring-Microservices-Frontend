/* eslint-disable */
import React from 'react'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

import CreateCompany from './createCompany'

vi.mock('../navigation.jsx', () => ({ default: () => <div data-testid="nav" /> }))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom')
  return { ...real, useNavigate: () => navigateMock }
})

vi.mock('../../services/authService', () => ({
  getCurrentUser: () => ({ role: 2, fullName: 'Admin Alice' }),
}))

const apiPostMock = vi.fn()
const apiGetMock = vi.fn()
vi.mock('../../services/api.js', () => ({
  __esModule: true,
  default: {
    post: (...args) => apiPostMock(...args),
    get: (...args) => apiGetMock(...args),
  },
}))

const swalFireMock = vi.fn().mockResolvedValue({})
vi.mock('sweetalert2', () => ({
  __esModule: true,
  default: { fire: (...args) => swalFireMock(...args) },
}))

const createObjectURLMock = vi.fn(() => 'blob:mock-url')
const revokeObjectURLMock = vi.fn()
beforeAll(() => {
  global.URL.createObjectURL = createObjectURLMock
  global.URL.revokeObjectURL = revokeObjectURLMock
})

beforeEach(() => {
  vi.clearAllMocks()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateCompany />
    </MemoryRouter>
  )
}

test('renders base form', () => {
  renderPage()
  expect(screen.getByText(/create company/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/website/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
})

test('validation: name required; invalid website blocks submit', async () => {
  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /^create$/i }))
  expect(await screen.findByText(/name is required\./i)).toBeInTheDocument()
  expect(apiPostMock).not.toHaveBeenCalled()

  await userEvent.type(screen.getByLabelText(/name/i), 'ACME')
  await userEvent.type(screen.getByLabelText(/website/i), 'ftp://bad.url')
  await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

  expect(await screen.findByText(/website must be a valid http\(s\) url\./i)).toBeInTheDocument()
  expect(apiPostMock).not.toHaveBeenCalled()
})

test('file picker: non-image shows error; large image (>3MB) shows error; valid image shows preview', async () => {
  renderPage()

  const fileInput = screen.getByLabelText(/logo/i).parentElement.querySelector('input[type="file"]')
  expect(fileInput).toBeInTheDocument()

  const txt = new File([new TextEncoder().encode('hello')], 'note.txt', { type: 'text/plain' })
  await userEvent.upload(fileInput, txt)
  expect(await screen.findByText(/please choose an image file\./i)).toBeInTheDocument()
  expect(screen.queryByAltText(/logo preview/i)).not.toBeInTheDocument()


  const big = new File([new Uint8Array(3 * 1024 * 1024 + 10)], 'big.png', { type: 'image/png' })
  await userEvent.upload(fileInput, big)
  expect(await screen.findByText(/image too large \(max 3mb\)\./i)).toBeInTheDocument()
  expect(screen.queryByAltText(/logo preview/i)).not.toBeInTheDocument()


  const ok = new File([new Uint8Array(1024)], 'ok.png', { type: 'image/png' })
  await userEvent.upload(fileInput, ok)

  expect(await screen.findByAltText(/logo preview/i)).toBeInTheDocument()
  expect(createObjectURLMock).toHaveBeenCalled()
})

test('clear logo revokes object url and removes preview', async () => {
  renderPage()

  const fileInput = screen.getByLabelText(/logo/i).parentElement.querySelector('input[type="file"]')
  const ok = new File([new Uint8Array(512)], 'ok.png', { type: 'image/png' })
  await userEvent.upload(fileInput, ok)
  expect(await screen.findByAltText(/logo preview/i)).toBeInTheDocument()

  const clearBtn = screen.getByRole('button', { name: /remove selected image/i })
  await userEvent.click(clearBtn)

  await waitFor(() => {
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')
    expect(screen.queryByAltText(/logo preview/i)).not.toBeInTheDocument()
  })
})

test('submit success without logo: posts FormData, shows success Swal, navigates back', async () => {
  renderPage()

  await userEvent.type(screen.getByLabelText(/name/i), 'ACME Inc.')
  await userEvent.type(screen.getByLabelText(/website/i), 'https://acme.example.com')
  await userEvent.type(screen.getByLabelText(/description/i), 'A cool company')

  apiPostMock.mockResolvedValue({ data: { id: 123 } })

  await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

  await waitFor(() => {
    expect(apiPostMock).toHaveBeenCalledTimes(1)
  })

  const [url, fd, cfg] = apiPostMock.mock.calls[0]
  expect(url).toBe('/api/company/create')
  expect(fd).toBeInstanceOf(FormData)
  expect(typeof cfg?.onUploadProgress).toBe('function')

  const companyBlob = fd.get('company')
  expect(companyBlob).toBeInstanceOf(Blob)
  const companyText = await companyBlob.text()
  const companyObj = JSON.parse(companyText)
  expect(companyObj).toMatchObject({
    name: 'ACME Inc.',
    website: 'https://acme.example.com',
    description: 'A cool company',
  })
  expect(fd.get('logo')).toBeNull()

  expect(swalFireMock).toHaveBeenCalledWith(
    expect.objectContaining({ icon: 'success', title: 'Company created', text: expect.stringMatching(/ID: 123/) })
  )
  expect(navigateMock).toHaveBeenCalledWith(-1)
})

test('submit success with logo: FormData includes `logo` file', async () => {
  renderPage()

  await userEvent.type(screen.getByLabelText(/name/i), 'ACME')
  const fileInput = screen.getByLabelText(/logo/i).parentElement.querySelector('input[type="file"]')
  const ok = new File([new Uint8Array(256)], 'logo.png', { type: 'image/png' })
  await userEvent.upload(fileInput, ok)

  apiPostMock.mockResolvedValue({ data: { id: 555 } })
  await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

  await waitFor(() => expect(apiPostMock).toHaveBeenCalled())

  const [, fd] = apiPostMock.mock.calls[0]
  const logo = fd.get('logo')
  expect(logo).toBeInstanceOf(File)
  expect(logo.name).toBe('logo.png')
})

test('submit failure shows Swal error (backend message)', async () => {
  renderPage()

  await userEvent.type(screen.getByLabelText(/name/i), 'Bad Co.')

  apiPostMock.mockRejectedValue({ response: { data: { message: 'Backend says no' } } })
  await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

  await waitFor(() => {
    expect(swalFireMock).toHaveBeenCalledWith(
      expect.objectContaining({ icon: 'error', title: 'Failed', text: 'Backend says no' })
    )
  })
  expect(navigateMock).not.toHaveBeenCalled()
})

test('Reset button clears fields and preview', async () => {
  renderPage()

  const name = screen.getByLabelText(/name/i)
  const website = screen.getByLabelText(/website/i)
  const desc = screen.getByLabelText(/description/i)

  await userEvent.type(name, 'XYZ')
  await userEvent.type(website, 'https://x.com')
  await userEvent.type(desc, 'hello')

  const fileInput = screen.getByLabelText(/logo/i).parentElement.querySelector('input[type="file"]')
  const ok = new File([new Uint8Array(256)], 'logo.png', { type: 'image/png' })
  await userEvent.upload(fileInput, ok)
  expect(await screen.findByAltText(/logo preview/i)).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /^reset$/i }))

  expect(name).toHaveValue('')
  expect(website).toHaveValue('')
  expect(desc).toHaveValue('')
  expect(screen.queryByAltText(/logo preview/i)).not.toBeInTheDocument()
})

test('Back button navigates -1', async () => {
  renderPage()
  const backBtn = screen.getByRole('button', { name: /back/i })
  await userEvent.click(backBtn)
  expect(navigateMock).toHaveBeenCalledWith(-1)
})
