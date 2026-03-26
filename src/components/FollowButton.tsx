"use client"

import { Button } from "antd"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function FollowButton({
  userId,
  initialFollowing,
}: {
  userId: string
  initialFollowing: boolean
}) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setFollowing(initialFollowing)
  }, [initialFollowing])

  const toggle = async () => {
    setLoading(true)
    try {
      const method = following ? "DELETE" : "POST"
      const res = await fetch(`/api/users/${userId}/follow`, { method })
      if (!res.ok) {
        return
      }
      setFollowing(!following)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button type="primary" ghost={following} onClick={toggle} loading={loading}>
      {following ? "Unfollow" : "Follow"}
    </Button>
  )
}
