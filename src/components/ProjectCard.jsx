export default function ProjectCard({ project, onClick, style }) {
  return (
    <article data-card style={style} className="cursor-pointer group" onClick={() => onClick(project)}>

      <div className="relative overflow-hidden">
        <img
          src={project.thumbnail || project.images[0]}
          alt={project.client}
          className="w-full aspect-[3/4] object-cover bg-black transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          loading="lazy"
        />
        {/* Client name glisse du bas */}
        <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-8 bg-gradient-to-t from-black/55 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
          <span className="text-xs text-white/90 uppercase tracking-widest">
            {project.client}
          </span>
        </div>
      </div>

      <div className="pt-3 text-center text-sm font-normal text-muted transition-colors duration-200 group-hover:text-black">
        {project.number}
      </div>

    </article>
  )
}
