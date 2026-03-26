import { z } from "zod"

export const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscore"),
  password: z.string().min(6).max(128),
})

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export const commentSchema = z.object({
  text: z.string().min(1).max(2000),
})
