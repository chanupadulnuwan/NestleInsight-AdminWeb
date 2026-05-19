import { useState } from 'react'
import AuthModal from '../components/AuthModal'
import Footer from '../components/Footer'
import FeaturesSection from '../components/FeaturesSection'
import HeroSection from '../components/HeroSection'
import HighlightSection from '../components/HighlightSection'
import MissionVisionSection from '../components/MissionVisionSection'
import ProblemSection from '../components/ProblemSection'

export default function Home() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  return (
    <div className="bg-white text-[#1a120c]">
      {/* Website auth update: keep the hero unchanged visually while letting the navbar Login button open the portal modal. */}
      <HeroSection onLoginClick={() => setIsAuthModalOpen(true)} />
      <main className="relative overflow-hidden bg-white">
        <MissionVisionSection />
        <ProblemSection />
        <FeaturesSection />
        <HighlightSection />
      </main>
      <Footer />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  )
}
