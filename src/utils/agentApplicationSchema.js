import { z } from 'zod'

export const EXPERIENCE_OPTIONS = ['<1', '1-3', '3-5', '5+']

export function createAgentApplicationSchema(t) {
  return z.object({
    full_name: z
      .string({ message: t('agentApply.error_full_name') })
      .trim()
      .min(1, { message: t('agentApply.error_full_name') }),
    email: z
      .string({ message: t('agentApply.error_email') })
      .trim()
      .min(1, { message: t('agentApply.error_email') })
      .email({ message: t('agentApply.error_email_invalid') }),
    whatsapp: z
      .string({ message: t('agentApply.error_whatsapp') })
      .trim()
      .min(1, { message: t('agentApply.error_whatsapp') })
      .regex(/^\+?[0-9\s-]+$/, { message: t('agentApply.error_whatsapp_invalid') }),
    nib: z
      .string({ message: t('agentApply.error_nib') })
      .trim()
      .min(1, { message: t('agentApply.error_nib') })
      .regex(/^\d+$/, { message: t('agentApply.error_nib_invalid') }),
    agency: z.string().trim(),
    experience: z
      .enum(['', ...EXPERIENCE_OPTIONS], { message: t('agentApply.error_experience') })
      .default(''),
    region: z.string().trim(),
    portfolio: z.string().trim(),
    agreed: z.literal(true, { message: t('agentApply.error_agreement') }),
  })
}

export function buildAgentApplicationPayload(values, userId, email) {
  return {
    user_id: userId,
    full_name: values.full_name,
    email,
    whatsapp: values.whatsapp,
    nib: values.nib,
    agency: values.agency,
    experience: values.experience,
    region: values.region,
    portfolio: values.portfolio,
    agreement_accepted_at: new Date().toISOString(),
  }
}
