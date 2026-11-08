export { calculateStartingPlan, calculateDailyEnergyOffset, calculateCalorieFloor } from './nutrition.utils';
export { goalRatePresets, defaultRatePresets, goalOptions, activityLevelOptions, nutritionInputBounds } from './nutrition.types';
export { nutritionProfileSchema, goalSelectionSchema, startingPlanInputSchema } from './nutrition.schemas';
export type { Sex, ActivityLevel, Goal, GoalSelection, NutritionProfile, StartingPlanInput, CalorieFloor, StartingPlan } from './nutrition.types';
export { createNutritionEdits, nutritionEdits, NutritionEditError } from './services/nutrition-edits';
export { useEditGoal, useEditKcalTarget, useEditProteinFloor } from './hooks/useNutritionEdits';
export { useNutritionTargetEditor } from './hooks/useNutritionTargetEditor';
export type { NutritionTargetEditorModel } from './hooks/useNutritionTargetEditor';
