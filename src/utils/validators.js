import {FORM_ERRORS} from "../errors/formErrors";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isSixDigits = (v) => /^\d{6}$/.test(v);

export const validateField = (name, value) => {
    switch (name) {
        case "fullName":
            if (!value.trim()) return FORM_ERRORS.REQUIRED;
            return "";
        case "email":
            if (!value.trim()) return FORM_ERRORS.REQUIRED;
            if (!isEmail(value)) return FORM_ERRORS.INVALID_EMAIL;
            return "";
        case "password":
            if (!value) return FORM_ERRORS.REQUIRED;
            if (value.length < 6) return FORM_ERRORS.PASSWORD_SHORT;
            return "";
        case "code":
            if (!value) return FORM_ERRORS.REQUIRED;
            if (!isSixDigits(value)) return FORM_ERRORS.CODE_LENGTH;
            return "";
        default:
            return "";
    }
};
