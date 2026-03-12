export default function ProjectCard({ project, onClick, style }) {
  return (
    <article
      data-card
      style={style}
      className="cursor-pointer relative group/card"
      onClick={() => onClick(project)}
    >
      <div className="relative aspect-[4/5] bg-white flex items-center justify-center overflow-hidden">
        <img
          src={project.thumbnail || project.images[0]}
          alt={project.client}
          className="w-full h-full object-contain"
          loading="lazy"
        />
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-3 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
          <div className="bg-black/70 backdrop-blur-sm px-3 py-2 flex items-center gap-2">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
            <span className="text-[10px] text-white uppercase tracking-widest whitespace-nowrap">
              View project
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2 text-[10px] font-extralight uppercase tracking-widest text-black/60 text-center">
        {project.client}
      </div>
    </article>
  )
}
