import { OnboardingProvider } from "@/components/onboarding/onboarding-context"
import { OnboardingShell } from "@/components/onboarding/OnboardingShell"

export default function RegisterPage() {
  return (
    <OnboardingProvider>
      <OnboardingShell />
    </OnboardingProvider>
  )
}
