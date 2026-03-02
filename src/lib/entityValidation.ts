import { getEntityDef } from "./entityRegistry";
import { RuleAction } from "../types";

export interface ValidationResult {
    isValid: boolean;
    clampedValue: number;
    originalValue: number;
    warning?: string;
}

/**
 * Validate and clamp an action value based on entity registry constraints.
 * Returns the clamped value and any warnings.
 */
export function validateActionValue(
    entityType: string,
    targetField: string,
    newValue: number,
): ValidationResult {
    const entityDef = getEntityDef(entityType);
    const fieldDef = entityDef?.editableFields.find((f) => f.key === targetField);

    if (!fieldDef || fieldDef.type !== "number") {
        return { isValid: true, clampedValue: newValue, originalValue: newValue };
    }

    let clamped = newValue;
    const warnings: string[] = [];

    if (fieldDef.min !== undefined && clamped < fieldDef.min) {
        warnings.push(
            `${fieldDef.label} ${clamped.toFixed(2)} < min ${fieldDef.min} → clamped to ${fieldDef.min}`,
        );
        clamped = fieldDef.min;
    }

    if (fieldDef.max !== undefined && clamped > fieldDef.max) {
        warnings.push(
            `${fieldDef.label} ${clamped.toFixed(2)} > max ${fieldDef.max} → clamped to ${fieldDef.max}`,
        );
        clamped = fieldDef.max;
    }

    return {
        isValid: warnings.length === 0,
        clampedValue: clamped,
        originalValue: newValue,
        warning: warnings.length > 0 ? warnings.join("; ") : undefined,
    };
}

/**
 * Compute the new value for an action based on the current value.
 */
export function computeActionValue(
    currentValue: number,
    action: RuleAction,
): number {
    if (action.value === undefined) return currentValue;

    switch (action.type) {
        case "increase":
            return action.unit === "%"
                ? currentValue * (1 + action.value / 100)
                : currentValue + action.value;
        case "decrease":
            return action.unit === "%"
                ? currentValue * (1 - action.value / 100)
                : currentValue - action.value;
        case "set":
            return action.value;
        default:
            return currentValue;
    }
}
