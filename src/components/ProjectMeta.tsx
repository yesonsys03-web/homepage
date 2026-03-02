import { Badge } from "@/components/ui/badge"

type ProjectMetaProps = {
  title: string
  summary: string
  tags: string[]
  author: string
  likes: number
  comments: number
  createdAt?: string
}

export function ProjectMeta({
  title,
  summary,
  tags,
  author,
  likes,
  comments,
  createdAt,
}: ProjectMetaProps) {
  return (
    <>
      <h3 className="font-display text-lg font-semibold text-[#F4F7FF] mb-1 truncate">{title}</h3>
      <p className="text-sm text-[#B8C3E6] mb-3 line-clamp-2">{summary}</p>
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-[#111936] text-[#B8C3E6] text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#B8C3E6]">{createdAt ? createdAt : `by ${author}`}</span>
        <div className="flex gap-3 text-[#B8C3E6]">
          <span>❤️ {likes}</span>
          <span>💬 {comments}</span>
        </div>
      </div>
    </>
  )
}
