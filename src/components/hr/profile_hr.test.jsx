/* eslint-disable */
import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../services/api.js", () => ({
    default: { get: vi.fn() },
}));

vi.mock("../../App.css", () => ({}), { virtual: true });

vi.mock("../navigation.jsx", () => ({
    default: () => <div data-testid="nav" />,
}));

vi.mock("../../services/authService", () => ({
    getCurrentUser: () => ({
        fullName: "HR Alice",
        email: "alice@example.com",
    }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

import ProfileHR from "./profile_hr.jsx";
import api from "../../services/api.js";

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("jobspring_token", "fake-token");
});

function renderProfile() {
    return render(
        <MemoryRouter>
            <ProfileHR />
        </MemoryRouter>
    );
}

test("renders HR profile info from getCurrentUser", async () => {
    api.get.mockResolvedValueOnce({ data: "OpenAI Pte Ltd" });
    renderProfile();
    await screen.findByDisplayValue("OpenAI Pte Ltd");
    expect(screen.getByDisplayValue("HR Alice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("alice@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("OpenAI Pte Ltd")).toBeInTheDocument();
});

test('shows "Not Available" when token is missing', async () => {
    localStorage.removeItem("jobspring_token");
    api.get.mockResolvedValueOnce({ data: "Should not call" });
    renderProfile();
    expect(await screen.findByDisplayValue(/Not Available/i)).toBeInTheDocument();
});

test("clicking Back navigates to HR job position page", async () => {
    api.get.mockResolvedValueOnce({ data: "OpenAI Pte Ltd" });
    renderProfile();
    const backBtn = await screen.findByRole("button", { name: /Back/i });
    await userEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/hr/JobPosition");
});
