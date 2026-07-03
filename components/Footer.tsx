export function Footer() {
  return (
    <footer className="w-full border-t bg-muted/40 mt-auto">
      <div className="container mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Aacharya Pairing Management System. All rights reserved.</p>
        <div className="flex space-x-4 mt-4 sm:mt-0">
          <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
