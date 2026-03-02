import { Card, CardContent } from "@/components/ui/card"
import type { Comment } from "@/lib/api"

type CommentListProps = {
  comments: Comment[]
  onReport?: (commentId: string) => void
  formatDate: (dateStr: string) => string
}

export function CommentList({ comments, onReport, formatDate }: CommentListProps) {
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <Card key={comment.id} className="bg-[#161F42] border-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <strong className="text-[#F4F7FF]">{comment.author_nickname}</strong>
                <span className="text-[#B8C3E6] text-sm ml-2">{formatDate(comment.created_at)}</span>
              </div>
              <button
                className="text-[#B8C3E6] hover:text-[#FF6B6B] text-sm duration-100"
                onClick={() => onReport?.(comment.id)}
              >
                신고
              </button>
            </div>
            <p className="text-[#F4F7FF]">{comment.content}</p>
            <button className="text-[#B8C3E6] text-sm mt-2 hover:text-[#23D5AB] duration-100">
              ❤️ {comment.like_count}
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
