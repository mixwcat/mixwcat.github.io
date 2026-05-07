import { author, site } from '@/config.json'
import { getFormattedDateTime } from '@/utils/date'
import { AnimatedSignature } from '../AnimatedSignature'
import { useEffect, useState } from 'react'
import { toast } from "react-toastify";

function getPostUrl(slug: string) {
  return new URL(slug, site.url).href
}

export function PostCopyright({
  title,
  slug,
  lastMod,
}: {
  title: string
  slug: string
  lastMod: Date
}) {
  const [lastModStr, setLastModStr] = useState('')
  const url = getPostUrl(slug)

  function handleCopyUrl() {
    navigator.clipboard.writeText(url)
    toast.success('已复制文章链接')
  }

  useEffect(() => {
    setLastModStr(getFormattedDateTime(lastMod))
  }, [lastMod])

  return (
    <section className="text-xs leading-loose text-secondary">
      <p>文章标题：{title}</p>
      <p>文章作者：{author.name}</p>
      <p>
        <span>文章链接：{url}</span>
        <span role="button" className="cursor-pointer select-none" onClick={handleCopyUrl}>
          [复制]
        </span>
      </p>
      <p>最后修改时间：{lastModStr}</p>
      <hr className="my-3 border-primary" />
      <div>
        <div className="float-right ml-4 my-2">
          <AnimatedSignature />
        </div>
        <p>
          感谢阅读！如果您喜欢这篇文章，欢迎分享给更多人。
          <br />
          本文采用
          <a
            className="hover:underline hover:text-accent underline-offset-2"
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY-NC-SA 4.0
          </a>
          进行许可。
        </p>
      </div>
    </section>
  )
}
