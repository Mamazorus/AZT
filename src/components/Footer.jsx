export default function Footer() {
  return (
    <footer className="px-4 md:px-6 py-6 flex flex-col md:flex-row items-center justify-between bg-white text-xs uppercase tracking-wide mt-auto gap-4 md:gap-0 text-center md:text-left">
      <div className="flex-1">
        <span>MAËL AUZENET© 2026</span>
        <br />
        <span>POWER BY <a href="https://sordulo.web.app/" target="_blank" rel="noopener noreferrer" className="underline">SORDULO</a></span>
      </div>
      <div className="flex-1 md:text-center">
        <span>PARIS, ÎLE DE FRANCE</span>
        <br />
        <span>48.8566° N ; 2.3522° E</span>
      </div>
      <div className="flex-1 md:text-right">
        <span>DISCLAIMER</span>
        <br />
        <span>ALL RIGHTS RESERVED</span>
      </div>
    </footer>
  )
}
