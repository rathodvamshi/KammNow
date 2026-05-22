export const calculateEmployerTrust = (
  rating: number, // 0 to 5
  completedHires: number,
  verified: boolean,
  responseRate: number, // 0 to 100
  reports: number
): number => {
  let score = (rating / 5) * 100 * 0.40;
  score += Math.min(completedHires, 100) * 0.25;
  score += verified ? 20 : 0;
  score += responseRate * 0.10;
  score -= reports * 15;
  return Math.max(0, Math.min(score, 100)); // Clamp between 0 and 100
};

export const calculateWorkerTrust = (
  rating: number, // 0 to 5
  completedTasks: number,
  verified: boolean,
  attendance: number, // 0 to 100
  reports: number
): number => {
  let score = (rating / 5) * 100 * 0.40;
  score += Math.min(completedTasks, 100) * 0.30;
  score += attendance * 0.15;
  score += verified ? 10 : 0;
  score -= reports * 20;
  return Math.max(0, Math.min(score, 100)); // Clamp between 0 and 100
};
