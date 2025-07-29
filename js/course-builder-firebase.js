// Course Builder Firebase Integration
console.log('🚀 تحميل Course Builder Firebase...');

// متغيرات عامة
let currentCourseId = null;
let currentCourseData = {
    title: '',
    subtitle: '',
    description: '',
    instructor: '',
    category: '',
    level: 'beginner',
    language: 'ar',
    price: 0,
    currency: 'EGP',
    status: 'draft',
    modules: []
};

// تحميل بيانات الدورة عند فتح الصفحة
window.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 تحميل الصفحة...');
    
    // التحقق من تسجيل الدخول
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            console.log('❌ المستخدم غير مسجل الدخول');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('✅ المستخدم مسجل:', user.email);
        
        // الحصول على معرف الدورة من URL
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id');
        
        if (courseId && courseId !== 'new') {
            currentCourseId = courseId;
            await loadCourse(courseId);
        } else {
            // دورة جديدة
            console.log('📝 إنشاء دورة جديدة');
            updateUI();
        }
        
        // تفعيل الأزرار والنماذج
        initializeEventListeners();
    });
});

// تحميل بيانات الدورة
async function loadCourse(courseId) {
    try {
        console.log('📥 تحميل الدورة:', courseId);
        const doc = await db.collection('courses').doc(courseId).get();
        
        if (doc.exists) {
            currentCourseData = doc.data();
            console.log('✅ تم تحميل بيانات الدورة:', currentCourseData);
            updateUI();
        } else {
            console.error('❌ الدورة غير موجودة');
            alert('الدورة المطلوبة غير موجودة');
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل الدورة:', error);
        alert('حدث خطأ في تحميل بيانات الدورة');
    }
}

// تحديث واجهة المستخدم
function updateUI() {
    console.log('🎨 تحديث الواجهة...');
    
    // تحديث العنوان في الأعلى
    const pageTitleElements = document.querySelectorAll('.page-title, h1');
    pageTitleElements.forEach(el => {
        if (el.textContent.includes('ملاذ') || el.classList.contains('course-title')) {
            el.textContent = currentCourseData.title || 'دورة جديدة';
        }
    });
    
    // تحديث حقول النموذج
    const titleInput = document.querySelector('input[name="title"], input[placeholder*="اسم الدورة"]');
    if (titleInput) titleInput.value = currentCourseData.title || '';
    
    const subtitleInput = document.querySelector('input[name="subtitle"], input[placeholder*="عنوان فرعي"]');
    if (subtitleInput) subtitleInput.value = currentCourseData.subtitle || '';
    
    const descriptionInput = document.querySelector('textarea[name="description"], textarea[placeholder*="وصف"]');
    if (descriptionInput) descriptionInput.value = currentCourseData.description || '';
    
    // تحديث المنهج
    updateCurriculumUI();
}

// تحديث واجهة المنهج
function updateCurriculumUI() {
    console.log('📚 تحديث المنهج...');
    const modulesContainer = document.getElementById('modules-container') || 
                           document.querySelector('.modules-container') ||
                           document.querySelector('[data-modules]');
    
    if (!modulesContainer) {
        console.error('❌ لم يتم العثور على حاوية الوحدات');
        return;
    }
    
    // مسح المحتوى الحالي
    modulesContainer.innerHTML = '';
    
    // إضافة الوحدات
    if (currentCourseData.modules && currentCourseData.modules.length > 0) {
        currentCourseData.modules.forEach((module, index) => {
            const moduleElement = createModuleElement(module, index);
            modulesContainer.appendChild(moduleElement);
        });
    }
    
    // إضافة زر إضافة وحدة
    const addModuleBtn = document.createElement('button');
    addModuleBtn.className = 'btn btn-primary';
    addModuleBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة وحدة جديدة';
    addModuleBtn.onclick = addModule;
    modulesContainer.appendChild(addModuleBtn);
}

// إنشاء عنصر الوحدة
function createModuleElement(module, moduleIndex) {
    const moduleDiv = document.createElement('div');
    moduleDiv.className = 'module';
    moduleDiv.innerHTML = `
        <div class="module-header">
            <div class="module-info">
                <h4 class="module-title">الوحدة ${moduleIndex + 1}: ${module.title}</h4>
                <div class="module-meta">
                    <span><i class="fas fa-book-open"></i> ${module.lessons ? module.lessons.length : 0} دروس</span>
                </div>
            </div>
            <div class="module-actions">
                <button class="btn btn-sm btn-secondary" onclick="editModule(${moduleIndex})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteModule(${moduleIndex})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="module-content">
            <div class="lessons-container" id="lessons-${moduleIndex}">
                ${module.lessons ? module.lessons.map((lesson, lessonIndex) => createLessonElement(lesson, moduleIndex, lessonIndex)).join('') : ''}
            </div>
            <button class="add-content-btn" onclick="showAddLessonModal(${moduleIndex})">
                <i class="fas fa-plus"></i> إضافة محتوى
            </button>
        </div>
    `;
    return moduleDiv;
}

// إنشاء عنصر الدرس
function createLessonElement(lesson, moduleIndex, lessonIndex) {
    const iconClass = {
        'video': 'fa-video',
        'text': 'fa-file-alt',
        'quiz': 'fa-question-circle',
        'assignment': 'fa-tasks'
    };
    
    return `
        <div class="lesson">
            <div class="lesson-icon ${lesson.type}">
                <i class="fas ${iconClass[lesson.type] || 'fa-file'}"></i>
            </div>
            <div class="lesson-info">
                <h5 class="lesson-title">${lesson.title}</h5>
                <span class="lesson-duration">${lesson.duration || ''}</span>
            </div>
            <div class="lesson-actions">
                <button class="btn btn-sm btn-secondary" onclick="editLesson(${moduleIndex}, ${lessonIndex})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteLesson(${moduleIndex}, ${lessonIndex})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// إضافة وحدة جديدة
function addModule() {
    const title = prompt('أدخل اسم الوحدة:');
    if (title) {
        if (!currentCourseData.modules) {
            currentCourseData.modules = [];
        }
        
        currentCourseData.modules.push({
            title: title,
            lessons: []
        });
        
        updateCurriculumUI();
        saveCourse();
    }
}

// تعديل وحدة
function editModule(index) {
    const module = currentCourseData.modules[index];
    const newTitle = prompt('تعديل اسم الوحدة:', module.title);
    
    if (newTitle && newTitle !== module.title) {
        module.title = newTitle;
        updateCurriculumUI();
        saveCourse();
    }
}

// حذف وحدة
function deleteModule(index) {
    if (confirm('هل أنت متأكد من حذف هذه الوحدة؟')) {
        currentCourseData.modules.splice(index, 1);
        updateCurriculumUI();
        saveCourse();
    }
}

// عرض نافذة إضافة درس
function showAddLessonModal(moduleIndex) {
    // إنشاء نافذة منبثقة بسيطة
    const lessonType = prompt('اختر نوع الدرس:\n1. فيديو\n2. نص\n3. اختبار\n4. تمرين\n\nأدخل رقم الخيار:');
    
    const types = {
        '1': 'video',
        '2': 'text',
        '3': 'quiz',
        '4': 'assignment'
    };
    
    const type = types[lessonType];
    if (!type) return;
    
    const title = prompt('أدخل عنوان الدرس:');
    if (!title) return;
    
    let content = '';
    if (type === 'video') {
        content = prompt('أدخل رابط الفيديو (YouTube):');
    }
    
    const lesson = {
        type: type,
        title: title,
        content: content,
        duration: type === 'video' ? '10 دقائق' : ''
    };
    
    if (!currentCourseData.modules[moduleIndex].lessons) {
        currentCourseData.modules[moduleIndex].lessons = [];
    }
    
    currentCourseData.modules[moduleIndex].lessons.push(lesson);
    updateCurriculumUI();
    saveCourse();
}

// تعديل درس
function editLesson(moduleIndex, lessonIndex) {
    const lesson = currentCourseData.modules[moduleIndex].lessons[lessonIndex];
    const newTitle = prompt('تعديل عنوان الدرس:', lesson.title);
    
    if (newTitle) {
        lesson.title = newTitle;
        
        if (lesson.type === 'video') {
            const newContent = prompt('تعديل رابط الفيديو:', lesson.content);
            if (newContent) lesson.content = newContent;
        }
        
        updateCurriculumUI();
        saveCourse();
    }
}

// حذف درس
function deleteLesson(moduleIndex, lessonIndex) {
    if (confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
        currentCourseData.modules[moduleIndex].lessons.splice(lessonIndex, 1);
        updateCurriculumUI();
        saveCourse();
    }
}

// حفظ الدورة
async function saveCourse() {
    try {
        console.log('💾 حفظ الدورة...');
        
        // جمع البيانات من النموذج
        const titleInput = document.querySelector('input[name="title"], input[placeholder*="اسم الدورة"]');
        if (titleInput) currentCourseData.title = titleInput.value;
        
        const subtitleInput = document.querySelector('input[name="subtitle"], input[placeholder*="عنوان فرعي"]');
        if (subtitleInput) currentCourseData.subtitle = subtitleInput.value;
        
        const descriptionInput = document.querySelector('textarea[name="description"], textarea[placeholder*="وصف"]');
        if (descriptionInput) currentCourseData.description = descriptionInput.value;
        
        // إضافة بيانات إضافية
        currentCourseData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        currentCourseData.updatedBy = auth.currentUser.uid;
        
        if (currentCourseId) {
            // تحديث دورة موجودة
            await db.collection('courses').doc(currentCourseId).update(currentCourseData);
            console.log('✅ تم تحديث الدورة');
        } else {
            // إنشاء دورة جديدة
            currentCourseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            currentCourseData.createdBy = auth.currentUser.uid;
            
            const docRef = await db.collection('courses').add(currentCourseData);
            currentCourseId = docRef.id;
            console.log('✅ تم إنشاء دورة جديدة:', currentCourseId);
            
            // تحديث URL
            window.history.replaceState({}, '', `?id=${currentCourseId}`);
        }
        
        // تحديث العنوان في الواجهة
        updateUI();
        
        // إظهار رسالة نجاح
        showSuccessMessage('تم حفظ التغييرات بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في حفظ الدورة:', error);
        alert('حدث خطأ في حفظ البيانات: ' + error.message);
    }
}

// إظهار رسالة نجاح
function showSuccessMessage(message) {
    // البحث عن عنصر الرسالة أو إنشاؤه
    let messageEl = document.getElementById('success-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'success-message';
        messageEl.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #28a745;
            color: white;
            padding: 1rem 2rem;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 9999;
        `;
        document.body.appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

// تفعيل مستمعي الأحداث
function initializeEventListeners() {
    console.log('🎯 تفعيل الأحداث...');
    
    // زر حفظ التغييرات
    const saveButtons = document.querySelectorAll('[onclick*="saveCourse"], .btn-save, button:contains("حفظ")');
    saveButtons.forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            saveCourse();
        };
    });
    
    // حفظ تلقائي عند تغيير الحقول
    const inputs = document.querySelectorAll('input[name], textarea[name], select[name]');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            console.log('📝 تغيير في:', input.name);
            saveCourse();
        });
    });
    
    // معالجة التبويبات
    const tabs = document.querySelectorAll('[data-tab], .tab-button');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = tab.dataset.tab || tab.getAttribute('data-tab');
            if (tabName) switchTab(tabName);
        });
    });
}

// تبديل التبويبات
function switchTab(tabName) {
    console.log('🔄 تبديل إلى تبويب:', tabName);
    
    // إخفاء جميع التبويبات
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // إظهار التبويب المحدد
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // تحديث حالة الأزرار
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// دوال مساعدة عامة
window.saveCourse = saveCourse;
window.addModule = addModule;
window.editModule = editModule;
window.deleteModule = deleteModule;
window.showAddLessonModal = showAddLessonModal;
window.editLesson = editLesson;
window.deleteLesson = deleteLesson;
window.switchTab = switchTab;

console.log('✅ Course Builder Firebase جاهز!');
