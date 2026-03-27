type SectionIntroProps = {
  eyebrow: string
  title: string
  description: string
  align?: 'left' | 'center'
}

export default function SectionIntro({
  eyebrow,
  title,
  description,
  align = 'left',
}: SectionIntroProps) {
  const alignment = align === 'center' ? 'mx-auto text-center' : 'text-left'
  const descriptionWidth = align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'

  return (
    <div className={alignment}>
      <span className="inline-flex items-center gap-2 rounded-full border border-[#f1d4b7] bg-[#fff8f2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#9e5a22]">
        <span className="h-2 w-2 rounded-full bg-[#d17d39]" />
        {eyebrow}
      </span>
      <h2 className="mt-5 font-display text-3xl font-semibold tracking-[-0.03em] text-[#1c130d] sm:text-4xl lg:text-[2.9rem]">
        {title}
      </h2>
      <p className={`mt-4 text-base leading-8 text-[#675347] sm:text-lg ${descriptionWidth}`}>
        {description}
      </p>
    </div>
  )
}
