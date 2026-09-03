export const SPOT_DURATION = 15 // minutes
export const SLOTS_PER_HOUR = 60 / SPOT_DURATION
export const MINUTES = Array.from({length: SLOTS_PER_HOUR}, (_, i) => i * SPOT_DURATION)
export const START_HOUR = 7
export const END_HOUR = 24
export const WORK_HOURS = END_HOUR - START_HOUR
