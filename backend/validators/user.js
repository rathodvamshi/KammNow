const { z } = require('zod');

const profileSchema = z.object({
  phone: z.string().min(10).max(15),
  role: z.enum(['seeker', 'provider']).default('seeker'),
  name: z.string().min(2).optional(),
  bio: z.string().max(500).optional(),
  gender: z.string().optional(),
  languages: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  experience: z.number().min(0).optional()
});

module.exports = {
  profileSchema
};
