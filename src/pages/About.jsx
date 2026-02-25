export default function About() {
  return (
    <main className="flex-1 pt-[60px] pb-12">
      <section className="px-4 md:px-6 py-12 max-w-xl">
        {/* Bio Section */}
        <div className="mb-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-4">
            BIO
          </h2>
          <p className="text-sm leading-relaxed uppercase tracking-tight">
            I'M A GRAPHIC & WEB DESIGNER FROM ÎLE-DE-FRANCE, WORKING AROUND MUSIC,
            CULTURE AND IDENTITY.
            <br /><br />
            FROM COVER ART TO POSTERS AND WEBSITES, I BUILD VISUALS THAT CARRY EMOTION,
            STYLE AND CHARACTER, ESPECIALLY IN THE FRENCH RAP UNDERGROUND.
            <br /><br />
            OPEN TO FREELANCE WORK AND CREATIVE COLLABS.
          </p>
        </div>

        {/* Social Section */}
        <div className="mb-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-4">
            RESEAUX SOCIAUX
          </h2>
          <a 
            href="https://instagram.com/azt.mam" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-sm uppercase tracking-tight transition-opacity duration-150 hover:opacity-60 mb-2"
          >
            INSTAGRAM : @AZT.MAM
          </a>
          <a 
            href="mailto:aztdesignstudio@gmail.com"
            className="block text-sm uppercase tracking-tight transition-opacity duration-150 hover:opacity-60"
          >
            EMAIL ME : AZTDESIGNSTUDIO@GMAIL.COM
          </a>
        </div>
      </section>
    </main>
  )
}
