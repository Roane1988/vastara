import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'

const linkClass = 'text-slate-400 hover:text-white transition-colors duration-200 text-sm'

const socialLinks = [
  {
    label: 'Instagram',
    href: '#',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.38 2.525c.636-.247 1.363-.416 2.427-.465C8.76 2.013 9.095 2 12.315 2zm0 1.802c-2.41 0-2.695.013-3.707.06-.908.044-1.393.195-1.723.322a2.877 2.877 0 00-1.067.694 2.877 2.877 0 00-.694 1.067c-.127.33-.278.815-.322 1.722-.047 1.013-.06 1.297-.06 3.708v.63c0 2.41.013 2.695.06 3.707.044.908.195 1.393.322 1.723.173.43.398.81.694 1.067a2.877 2.877 0 001.067.694c.33.127.815.278 1.722.322 1.013.047 1.297.06 3.708.06h.63c2.41 0 2.695-.013 3.707-.06.908-.044 1.393-.195 1.723-.322a2.877 2.877 0 001.067-.694 2.877 2.877 0 00.694-1.067c.127-.33.278-.815.322-1.722.047-1.013.06-1.297.06-3.708v-.63c0-2.41-.013-2.695-.06-3.707-.044-.908-.195-1.393-.322-1.723a2.877 2.877 0 00-.694-1.067 2.877 2.877 0 00-1.067-.694c-.33-.127-.815-.278-1.722-.322-1.013-.047-1.297-.06-3.707-.06h-.63zm0 1.216c1.573 0 1.954.013 2.642.047.987.045 1.51.203 1.86.341.466.186.801.41 1.154.763.353.353.577.688.763 1.154.138.35.296.873.341 1.86.034.688.047 1.07.047 2.642s-.013 1.954-.047 2.642c-.045.987-.203 1.51-.341 1.86-.186.466-.41.801-.763 1.154-.353.353-.688.577-1.154.763-.35.138-.873.296-1.86.341-.663.031-1.018.042-2.642.042s-1.979-.01-2.642-.042c-.987-.045-1.51-.203-1.86-.341a2.898 2.898 0 01-1.154-.763 2.898 2.898 0 01-.763-1.154c-.138-.35-.296-.873-.341-1.86-.031-.663-.042-1.018-.042-2.642s.01-1.979.042-2.642c.045-.987.203-1.51.341-1.86.186-.466.41-.801.763-1.154.353-.353.688-.577 1.154-.763.35-.138.873-.296 1.86-.341.688-.034 1.069-.047 2.642-.047zm0 4.87a2.302 2.302 0 100 4.604 2.302 2.302 0 000-4.604zm0 1.216a1.086 1.086 0 110 2.172 1.086 1.086 0 010-2.172zm-3.782-1.607a.676.676 0 110 1.352.676.676 0 010-1.352z" />
      </svg>
    ),
  },
  {
    label: 'Twitter',
    href: '#',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: '#',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
]

const footerLinks = [
  {
    title: 'Layanan',
    links: [
      { label: 'Beranda', to: '/' },
      { label: 'Beli Properti', to: '/explore' },
      { label: 'Sewa Properti', to: '/coming-soon' },
      { label: 'Forum Komunitas', to: '/forum' },
    ],
  },
  {
    title: 'Perusahaan',
    links: [
      { label: 'Tentang Kami', to: '/coming-soon' },
      { label: 'PT Vastara Holding', href: '#' },
      { label: 'Hubungi Kami', to: '/coming-soon' },
    ],
  },
  {
    title: 'Dukungan',
    links: [
      { label: 'Kebijakan Privasi', to: '/coming-soon' },
      { label: 'Syarat & Ketentuan', to: '/coming-soon' },
      { label: 'Pusat Bantuan', to: '/coming-soon' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-brand-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:pt-16 lg:pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="md:col-span-2">
            <Link to="/" className="inline-block">
              <span className="text-2xl font-bold text-white tracking-tight">HuniOne</span>
            </Link>
            <p className="mt-4 text-slate-400 text-sm leading-relaxed max-w-sm">
              Platform properti terdepan dan terpercaya di Indonesia. Bagian dari ekosistem{' '}
              <span className="text-slate-300 font-medium">PT Vastara Holding Indonesia</span>.
            </p>
          </div>
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                {group.title}
              </h3>
              <ul className="space-y-3">
                {group.links.map((item) => {
                  if (item.href) {
                    return (
                      <li key={item.label}>
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${linkClass} inline-flex items-center gap-1`}
                        >
                          {item.label}
                          <ExternalLink size={12} />
                        </a>
                      </li>
                    )
                  }
                  return (
                    <li key={item.label}>
                      <Link to={item.to} className={linkClass}>
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-xs">
            &copy; 2026 PT Vastara Holding Indonesia. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-white transition-colors duration-200"
                aria-label={social.label}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
