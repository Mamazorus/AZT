import { CATEGORIES, GRID_OPTIONS } from '../data/projects'

export default function Controls({
  currentFilter,
  setCurrentFilter,
  currentColumns,
  setCurrentColumns,
  totalProjects = 0
}) {

  return (
    <div className="fixed top-[60px] left-0 right-0 px-4 md:px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between bg-white z-[99] gap-4 md:gap-0">
      {/* Grid buttons */}
      <div className="flex items-center gap-4">
        {GRID_OPTIONS.map((cols) => (
          <button
            key={cols}
            onClick={() => setCurrentColumns(cols)}
            className={`text-sm font-normal p-1 transition-colors duration-150 ${
              currentColumns === cols ? 'text-black' : 'text-muted hover:text-black'
            } ${cols === 6 ? 'hidden lg:block' : cols === 3 ? 'hidden sm:block' : cols === 2 ? 'sm:hidden' : ''}`}
          >
            {cols}
          </button>
        ))}
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-4 md:gap-6 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCurrentFilter(cat.id)}
            className={`text-sm font-normal tracking-wide uppercase transition-colors duration-150 ${
              currentFilter === cat.id ? 'text-black' : 'text-muted hover:text-black'
            }`}
          >
            {cat.id === 'all' && (
              <span className="text-xs text-muted mr-1">({totalProjects})</span>
            )}
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  )
}
