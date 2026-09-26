// lib/decisionEngine.ts

export interface SensorData {
  temperature: number;
  humidity: number;
  distance: number;   // ultrasonic distance in cm
  motion: boolean;    // PIR
}

export interface Decision {
  servoAngle: number; // 180 = open, 0 = closed
  bulb1: boolean;      // temperature-driven (ignored/blinking when motion is true)
  bulb2: boolean;      // humidity-driven (ignored/blinking when motion is true)
  blink: boolean;      // true when PIR motion overrides bulb1/bulb2 with a blink pattern
}

// Classroom-friendly thresholds — easy to trigger by hand/breath during a demo
const TEMP_THRESHOLD = 28;      // °C — bulb1 fires above this
const HUMIDITY_THRESHOLD = 60;  // %  — bulb2 fires above this
const DISTANCE_THRESHOLD = 15;  // cm — servo opens below this

export function computeDecision(sensors: SensorData): Decision {
  const doorOpen = sensors.distance < DISTANCE_THRESHOLD;
  const servoAngle = doorOpen ? 180 : 0;

  // Motion takes priority: while PIR detects motion, both bulbs blink
  // instead of following the temp/humidity rules.
  if (sensors.motion) {
    return {
      servoAngle,
      bulb1: false, // actual on/off state doesn't matter — Arduino handles the blink itself
      bulb2: false,
      blink: true,
    };
  }

  return {
    servoAngle,
    bulb1: sensors.temperature > TEMP_THRESHOLD,
    bulb2: sensors.humidity > HUMIDITY_THRESHOLD,
    blink: false,
  };
}