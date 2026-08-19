import Hero from '../components/Hero'
import AtmosphereSection from '../components/AtmosphereSection'
import MenuCategories from '../components/MenuCategories'
import FeaturedCoffee from '../components/FeaturedCoffee'
import NileSection from '../components/NileSection'
import ShishaSection from '../components/ShishaSection'
import LocationSection from '../components/LocationSection'

export default function Home() {
  return (
    <div className="page page--home">
      <Hero />
      <AtmosphereSection />
      <MenuCategories />
      <FeaturedCoffee />
      <NileSection />
      <ShishaSection />
      <LocationSection />
    </div>
  )
}
