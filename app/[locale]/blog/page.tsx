import Link from 'next/link';
import { Calendar, ArrowRight, BookOpen, MapPin, Plane } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  icon: React.ReactNode;
  category: string;
}

const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'How to Get a Student Visa for Germany',
    excerpt: 'A comprehensive guide to the German student visa application process, required documents, and timelines for international students.',
    date: '2024-01-15',
    icon: <Plane className="w-6 h-6" />,
    category: 'Visa & Immigration',
  },
  {
    id: '2',
    title: 'Top 5 German Cities for International Students',
    excerpt: 'Discover the best student cities in Germany based on affordability, quality of life, and university reputation.',
    date: '2024-01-10',
    icon: <MapPin className="w-6 h-6" />,
    category: 'City Guide',
  },
  {
    id: '3',
    title: 'Understanding the Blocked Account (Sperrkonto)',
    excerpt: 'Everything you need to know about the blocked account requirement, including how much you need and how to open one.',
    date: '2024-01-05',
    icon: <BookOpen className="w-6 h-6" />,
    category: 'Financial Planning',
  },
];

export default async function BlogPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Study Abroad Blog
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Expert tips and guides for international students planning to study in Germany
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <Link
              key={post.id}
              href={`/${locale}/blog/${post.id}`}
              className="group"
            >
              <article className="backdrop-blur-md bg-slate-950/80 border border-white/10 rounded-xl p-6 hover:bg-slate-950/90 hover:border-blue-500/30 transition-all duration-200 h-full flex flex-col">
                {/* Icon */}
                <div className="mb-4">
                  <div className="backdrop-blur-md bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 inline-flex">
                    <div className="text-blue-400">
                      {post.icon}
                    </div>
                  </div>
                </div>

                {/* Category */}
                <span className="text-xs text-blue-400 font-medium mb-2 block">
                  {post.category}
                </span>

                {/* Title */}
                <h2 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p className="text-white/70 mb-4 flex-grow">
                  {post.excerpt}
                </p>

                {/* Date and Read More */}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-white/50 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-400 group-hover:gap-2 transition-all">
                    <span className="text-sm font-medium">Read more</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
