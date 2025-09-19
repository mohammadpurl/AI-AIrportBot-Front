'use client'

export const ColorTest = () => {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold text-foreground">تست رنگ‌های سفارشی</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-navy-dark p-4 rounded-lg">
          <h3 className="text-text-light font-semibold">navy-dark</h3>
          <p className="text-text-muted">رنگ تیره ناوال</p>
        </div>
        
        <div className="bg-navy-surface p-4 rounded-lg">
          <h3 className="text-text-light font-semibold">navy-surface</h3>
          <p className="text-text-muted">سطح ناوال</p>
        </div>
        
        <div className="bg-navy-surface-light p-4 rounded-lg">
          <h3 className="text-text-light font-semibold">navy-surface-light</h3>
          <p className="text-text-muted">سطح روشن ناوال</p>
        </div>
        
        <div className="bg-golden-accent p-4 rounded-lg">
          <h3 className="text-navy-dark font-semibold">golden-accent</h3>
          <p className="text-navy-dark">رنگ طلایی</p>
        </div>
        
        <div className="bg-text-light p-4 rounded-lg border border-border">
          <h3 className="text-navy-dark font-semibold">text-light</h3>
          <p className="text-navy-dark">متن روشن</p>
        </div>
        
        <div className="bg-text-muted p-4 rounded-lg">
          <h3 className="text-text-light font-semibold">text-muted</h3>
          <p className="text-text-light">متن کمرنگ</p>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold text-foreground mb-4">تست کلاس bg-navy-dark</h2>
        <div className="bg-navy-dark min-h-[200px] p-6 rounded-lg">
          <h3 className="text-text-light text-lg font-semibold">این باید با رنگ navy-dark نمایش داده شود</h3>
          <p className="text-text-muted mt-2">اگر این متن را می‌بینید، رنگ navy-dark درست کار می‌کند!</p>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold text-foreground mb-4">تست کلاس‌های Gradient</h2>
        <div className="space-y-4">
          <h3 className="text-2xl font-bold gradient-bluish-text from-blue-400 to-cyan-400">
            متن با گرادیانت آبی
          </h3>
          <h3 className="text-2xl font-bold gradient-golden-text from-yellow-400 to-orange-400">
            متن با گرادیانت طلایی
          </h3>
          <h3 className="text-2xl font-bold gradient-navy-text from-navy-dark to-navy-surface">
            متن با گرادیانت ناوال
          </h3>
        </div>
      </div>
    </div>
  )
} 