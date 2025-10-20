/* eslint-disable */
import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../services/api.js", () => ({
    default: {
        get: vi.fn(),
        patch: vi.fn(),
    },
}));

vi.mock("../../services/hrService.js", () => ({
    getCompanyId: vi.fn(() => Promise.resolve("99")),
}));

vi.mock("../../services/authService.js", () => ({
    getCurrentUser: vi.fn(() => ({
        fullName: "HR Alice",
        email: "alice@example.com",
        role: "HR",
    })),
}));

vi.mock("../navigation.jsx", () => ({
    default: () => <div data-testid="nav" />,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ jobId: "123" }),
    };
});

import UpdateJob from "./updateJob.jsx";
import api from "../../services/api.js";

function renderJob() {
    return render(
        <MemoryRouter>
            <UpdateJob />
        </MemoryRouter>
    );
}

beforeEach(() => {
    vi.clearAllMocks();
});

test("loads and displays job details correctly", async () => {
    api.get.mockResolvedValueOnce({
        data: {
            title: "Software Engineer",
            employmentType: "1",
            salaryMin: "5000",
            salaryMax: "8000",
            location: "Singapore",
            description: "Develop backend microservices",
        },
    });

    renderJob();

    await waitFor(() =>
        expect(screen.getByDisplayValue("Software Engineer")).toBeInTheDocument()
    );
    expect(screen.getByDisplayValue("Singapore")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Develop backend microservices")).toBeInTheDocument();
});

test("shows validation errors on empty submit", async () => {
    api.get.mockResolvedValueOnce({
        data: { title: "", employmentType: "", salaryMin: "", salaryMax: "", location: "", description: "" },
    });

    renderJob();
    const btn = await screen.findByRole("button", { name: /Update Job/i });
    await userEvent.click(btn);

    const errs = await screen.findAllByText(/Please/);
    expect(errs.length).toBeGreaterThan(0);
});

test("shows error when update fails", async () => {
    api.get.mockResolvedValueOnce({
        data: {
            title: "Frontend Engineer",
            employmentType: "3",
            salaryMin: "4000",
            salaryMax: "6000",
            location: "Malaysia",
            description: "React + Vite frontend",
        },
    });
    api.patch.mockRejectedValueOnce(new Error("Network error"));

    renderJob();
    await waitFor(() => screen.getByDisplayValue("Frontend Engineer"));
    await userEvent.click(screen.getByRole("button", { name: /Update Job/i }));

    await waitFor(() =>
        expect(screen.getByText(/Failed to update job./i)).toBeInTheDocument()
    );
});

test("navigates back when Cancel clicked", async () => {
    api.get.mockResolvedValueOnce({
        data: {
            title: "QA Engineer",
            employmentType: "1",
            salaryMin: "3500",
            salaryMax: "5000",
            location: "Singapore",
            description: "Test automation",
        },
    });

    renderJob();

    const cancelBtn = await screen.findByRole("button", { name: /Cancel/i });
    await userEvent.click(cancelBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/hr/JobPosition");
});
