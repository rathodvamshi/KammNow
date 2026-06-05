const { z } = require('zod');

const profileSchema = z.object({
  // Phone in E.164 format e.g. +919876543210
  phone: z.string().min(10).max(20).optional(),
  // Allow all three role values the frontend can send
  role: z.enum(['seeker', 'provider', 'employer']).default('seeker'),
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  gender: z.string().optional(),
  languages: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  // age stored as `experience` in DB (int years), front sends both
  age: z.number().min(16).max(80).optional(),
  experience: z.number().min(0).optional(),
  is_profile_complete: z.boolean().optional(),
});

module.exports = {
  profileSchema,
};
