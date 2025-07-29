// Course Builder - Firebase Integration
// هذا الملف يحتوي على كل الوظائف الحقيقية للصفحة

// تهيئة المتغيرات العامة
let currentCourseId = null;
let courseData = {
    title: '',
    subtitle: '',
    shortDescription: '',
    description: '',
    category: '',
    level: '',
    language: '',
    slug: '',
    seoTitle: '',
    seoDescription: '',
    keywords: '',
    coverImage: '',
    promoVideo: '',
    price: 0,
    accessType: 'free',
    startDate: '',
    accessDuration: 'lifetime',
    maxStudents: null,
    autoEnroll: true,
    dripContent: false,
    certificate: true,
    status: 'draft',
    modules: [],
    createdAt: null,
    updatedAt: null
};
// التحقق من تسجيل الدخول
auth.onAuthStateChanged(user => {
    if (!user) {
        // غير مسجل دخول، حوّله لصفحة تسجيل الدخول
        window.location.href = 'login.html';
    } else {
        // مسجل دخول، ابدأ تحميل الدورة
        console.log('User logged in:', user.email);
        initializeCourse();
    }
});

// دالة لتوليد معرف فريد
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// دالة لتهيئة الدورة
async function initializeCourse() {
    // التحقق من وجود معرف الدورة في URL
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');
    
    if (courseId) {
        // تحميل بيانات الدورة الموجودة
        await loadCourse(courseId);
    } else {
        // إنشاء دورة جديدة
        currentCourseId = generateId();
        courseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await saveCourse();
    }
    
    // تحديث الواجهة
    updateUI();
}

// دالة لتحميل الدورة من Firebase
async function loadCourse(courseId) {
    try {
        const doc = await db.collection('courses').doc(courseId).get();
        
        if (doc.exists) {
            currentCourseId = courseId;
            courseData = doc.data();
            console.log('Course loaded:', courseData);
        } else {
            console.error('Course not found');
            window.location.href = 'courses-management.html';
        }
    } catch (error) {
        console.error('Error loading course:', error);
        showError('خطأ في تحميل الدورة');
    }
}

// دالة لحفظ الدورة في Firebase
async function saveCourse() {
    try {
        courseData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        await db.collection('courses').doc(currentCourseId).set(courseData, { merge: true });
        
        console.log('Course saved successfully');
        updateSaveIndicator('saved');
        showSuccessMessage('تم حفظ التغييرات بنجاح');
    } catch (error) {
        console.error('Error saving course:', error);
        showError('خطأ في حفظ الدورة');
        updateSaveIndicator('error');
    }
}

// دالة لتحديث الواجهة بالبيانات
function updateUI() {
    // تحديث العنوان في الشريط العلوي
    document.querySelector('.course-title-bar h1').textContent = courseData.title || 'دورة جديدة';
    
    // تحديث حالة النشر
    const statusBadge = document.querySelector('.status-badge');
    if (courseData.status === 'published') {
        statusBadge.className = 'status-badge published';
        statusBadge.innerHTML = '<i class="fas fa-circle" style="font-size: 0.5rem;"></i> منشورة';
        
        const publishBtn = document.querySelector('.btn-success');
        publishBtn.innerHTML = '<i class="fas fa-edit"></i> تعديل الدورة';
        publishBtn.className = 'btn btn-secondary btn-lg';
    }
    
    // تحديث المعلومات الأساسية
    document.querySelector('input[value="ملاذ الحياري"]').value = courseData.title || '';
    document.querySelector('input[value="خريطة البحث عن المأوى للقلوب التائهة"]').value = courseData.subtitle || '';
    document.querySelector('.form-textarea').value = courseData.shortDescription || '';
    
    // تحديث القوائم المنسدلة
    document.querySelector('.form-select').value = courseData.category || 'تطوير الذات';
    document.querySelectorAll('.form-select')[1].value = courseData.level || 'جميع المستويات';
    document.querySelectorAll('.form-select')[2].value = courseData.language || 'العربية';
    
    // تحديث رابط الدورة
    document.querySelector('input[value="malaz-alhayari"]').value = courseData.slug || '';
    
    // تحديث SEO
    document.querySelectorAll('.form-input')[4].value = courseData.seoTitle || '';
    document.querySelectorAll('.form-textarea')[1].value = courseData.seoDescription || '';
    document.querySelectorAll('.form-input')[5].value = courseData.keywords || '';
    
    // تحديث إعدادات التسعير
    document.querySelectorAll('.form-select')[3].value = courseData.accessType || 'مجانية';
    document.querySelector('input[type="date"]').value = courseData.startDate || '';
    document.querySelectorAll('.form-select')[4].value = courseData.accessDuration || 'وصول مدى الحياة';
    
    // تحديث التبديلات
    updateToggleSwitch('auto-enroll', courseData.autoEnroll);
    updateToggleSwitch('drip-content', courseData.dripContent);
    updateToggleSwitch('certificate', courseData.certificate);
    
    // تحديث المنهج
    updateCurriculum();
    
    // حساب نسبة الإكمال
    calculateProgress();
}

// دالة لتحديث حالة التبديل
function updateToggleSwitch(name, state) {
    const toggle = document.querySelector(`[data-toggle="${name}"]`);
    if (toggle) {
        if (state) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    }
}

// دالة لتحديث المنهج الدراسي
function updateCurriculum() {
    const container = document.getElementById('modules-container');
    container.innerHTML = '';
    
    courseData.modules.forEach((module, moduleIndex) => {
        const moduleElement = createModuleElement(module, moduleIndex);
        container.appendChild(moduleElement);
    });
    
    // إضافة زر إضافة وحدة في النهاية
    const addModuleBtn = document.createElement('button');
    addModuleBtn.className = 'btn btn-primary';
    addModuleBtn.style.width = '100%';
    addModuleBtn.style.marginTop = '1rem';
    addModuleBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة وحدة جديدة';
    addModuleBtn.onclick = addModule;
    container.appendChild(addModuleBtn);
}

// دالة لإنشاء عنصر وحدة
function createModuleElement(module, moduleIndex) {
    const moduleDiv = document.createElement('div');
    moduleDiv.className = 'module';
    moduleDiv.draggable = true;
    moduleDiv.dataset.moduleIndex = moduleIndex;
    
    const lessonsCount = module.lessons ? module.lessons.length : 0;
    const totalDuration = module.lessons ? module.lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0) : 0;
    
    moduleDiv.innerHTML = `
        <div class="module-header">
            <i class="fas fa-grip-vertical drag-handle"></i>
            <div class="module-info">
                <h4 class="module-title">${module.title}</h4>
                <div class="module-meta">
                    <span><i class="fas fa-book-open"></i> ${lessonsCount} دروس</span>
                    <span><i class="fas fa-clock"></i> ${totalDuration} دقيقة</span>
                </div>
            </div>
            <div class="module-actions">
                <button class="btn btn-icon btn-secondary" onclick="editModule(${moduleIndex})" data-tooltip="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-icon btn-secondary" onclick="deleteModule(${moduleIndex})" data-tooltip="حذف">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn btn-icon btn-secondary" onclick="toggleModule(this)" data-tooltip="طي/فتح">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
        </div>
        <div class="module-content">
            ${module.lessons ? module.lessons.map((lesson, lessonIndex) => createLessonElement(lesson, moduleIndex, lessonIndex)).join('') : ''}
            <button class="add-content-btn" onclick="showContentMenu(this, ${moduleIndex})">
                <i class="fas fa-plus"></i>
                إضافة محتوى
            </button>
        </div>
    `;
    
    return moduleDiv;
}

// دالة لإنشاء عنصر درس
function createLessonElement(lesson, moduleIndex, lessonIndex) {
    const iconClasses = {
        'video': 'fa-play',
        'text': 'fa-file-alt',
        'quiz': 'fa-question-circle',
        'assignment': 'fa-tasks',
        'live': 'fa-broadcast-tower',
        'download': 'fa-download'
    };
    
    const iconColors = {
        'video': 'video',
        'text': 'text',
        'quiz': 'quiz',
        'assignment': 'assignment'
    };
    
    return `
        <div class="lesson" draggable="true" data-module-index="${moduleIndex}" data-lesson-index="${lessonIndex}">
            <i class="fas fa-grip-vertical drag-handle"></i>
            <div class="lesson-icon ${iconColors[lesson.type] || ''}">
                <i class="fas ${iconClasses[lesson.type] || 'fa-file'}"></i>
            </div>
            <div class="lesson-info">
                <h5 class="lesson-title">${lesson.title}</h5>
                <span class="lesson-duration">${lesson.duration || 0} دقيقة</span>
            </div>
            <div class="lesson-actions">
                <button class="btn btn-icon btn-secondary btn-sm" onclick="editLesson(${moduleIndex}, ${lessonIndex})" data-tooltip="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="lesson-settings-btn" onclick="openLessonSettings(${moduleIndex}, ${lessonIndex})" data-tooltip="إعدادات">
        <i class="fas fa-cog"></i>
    </button>
                <button class="btn btn-icon btn-secondary btn-sm" onclick="previewLesson(${moduleIndex}, ${lessonIndex})" data-tooltip="معاينة">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-icon btn-secondary btn-sm" onclick="deleteLesson(${moduleIndex}, ${lessonIndex})" data-tooltip="حذف">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// دالة لإضافة وحدة جديدة
async function addModule() {
    const moduleTitle = prompt('أدخل عنوان الوحدة الجديدة:');
    
    if (moduleTitle && moduleTitle.trim()) {
        const newModule = {
            id: generateId(),
            title: moduleTitle.trim(),
            description: '',
            lessons: [],
            order: courseData.modules.length
        };
        
        courseData.modules.push(newModule);
        
        await saveCourse();
        updateCurriculum();
    }
}

// دالة لتعديل وحدة
async function editModule(moduleIndex) {
    const module = courseData.modules[moduleIndex];
    const newTitle = prompt('عدّل عنوان الوحدة:', module.title);
    
    if (newTitle && newTitle.trim() && newTitle !== module.title) {
        module.title = newTitle.trim();
        
        await saveCourse();
        updateCurriculum();
    }
}

// دالة لحذف وحدة
async function deleteModule(moduleIndex) {
    if (confirm('هل أنت متأكد من حذف هذه الوحدة وجميع دروسها؟')) {
        courseData.modules.splice(moduleIndex, 1);
        
        // إعادة ترتيب الوحدات
        courseData.modules.forEach((module, index) => {
            module.order = index;
        });
        
        await saveCourse();
        updateCurriculum();
    }
}

// دالة لإظهار قائمة المحتوى
function showContentMenu(button, moduleIndex) {
    const menu = document.getElementById('content-menu');
    const rect = button.getBoundingClientRect();
    
    menu.style.top = rect.bottom + 10 + 'px';
    menu.style.left = rect.left + 'px';
    menu.classList.add('active');
    menu.dataset.moduleIndex = moduleIndex;
    
    // إغلاق القائمة عند النقر خارجها
    setTimeout(() => {
        document.addEventListener('click', closeContentMenu);
    }, 100);
}

// دالة لإغلاق قائمة المحتوى
function closeContentMenu() {
    document.getElementById('content-menu').classList.remove('active');
    document.removeEventListener('click', closeContentMenu);
}

// دالة لإضافة درس
async function addLesson(type) {
    closeContentMenu();
    
    const moduleIndex = parseInt(document.getElementById('content-menu').dataset.moduleIndex);
    const module = courseData.modules[moduleIndex];
    
    // إظهار نموذج إضافة الدرس
    showLessonModal(type, moduleIndex);
}

// دالة لإظهار نافذة الدرس
function showLessonModal(type, moduleIndex, lessonIndex = null) {
    const modal = document.getElementById('lesson-modal');
    const isEdit = lessonIndex !== null;
    const lesson = isEdit ? courseData.modules[moduleIndex].lessons[lessonIndex] : null;
    
    // تحديث عنوان النافذة
    const titles = {
        'video': 'درس فيديو',
        'text': 'درس نصي',
        'quiz': 'اختبار',
        'assignment': 'تمرين عملي',
        'live': 'جلسة مباشرة',
        'download': 'ملف للتحميل'
    };
    
    modal.querySelector('.modal-title').textContent = (isEdit ? 'تعديل ' : 'إضافة ') + titles[type];
    
    // ملء البيانات إذا كان تعديل
    if (isEdit) {
        modal.querySelector('input[placeholder="أدخل عنوان الدرس"]').value = lesson.title;
        modal.querySelector('textarea').value = lesson.description || '';
        modal.querySelector('input[placeholder="مثال: 15:30"]').value = lesson.duration || '';
        
        // تحديث التبديلات
        updateModalToggle('free-preview', lesson.freePreview);
        updateModalToggle('downloadable', lesson.downloadable);
        updateModalToggle('comments', lesson.commentsEnabled);
    } else {
        // مسح النموذج
        modal.querySelector('input[placeholder="أدخل عنوان الدرس"]').value = '';
        modal.querySelector('textarea').value = '';
        modal.querySelector('input[placeholder="مثال: 15:30"]').value = '';
        
        updateModalToggle('free-preview', false);
        updateModalToggle('downloadable', false);
        updateModalToggle('comments', true);
    }
    
    // حفظ البيانات في النافذة
    modal.dataset.type = type;
    modal.dataset.moduleIndex = moduleIndex;
    modal.dataset.lessonIndex = lessonIndex;
    
    // إظهار النافذة
    modal.classList.add('active');
}

// دالة لتحديث تبديل في النافذة
function updateModalToggle(name, state) {
    const toggle = document.querySelector(`[data-modal-toggle="${name}"]`);
    if (toggle) {
        if (state) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    }
}

// دالة لحفظ الدرس
async function saveLesson() {
    const modal = document.getElementById('lesson-modal');
    const type = modal.dataset.type;
    const moduleIndex = parseInt(modal.dataset.moduleIndex);
    const lessonIndex = modal.dataset.lessonIndex ? parseInt(modal.dataset.lessonIndex) : null;
    
    const title = modal.querySelector('input[placeholder="أدخل عنوان الدرس"]').value.trim();
    const description = modal.querySelector('textarea').value.trim();
    const duration = modal.querySelector('input[placeholder="مثال: 15:30"]').value.trim();
    
    if (!title) {
        showError('يرجى إدخال عنوان الدرس');
        return;
    }
    
    const lessonData = {
        id: lessonIndex !== null ? courseData.modules[moduleIndex].lessons[lessonIndex].id : generateId(),
        type: type,
        title: title,
        description: description,
        duration: parseInt(duration) || 0,
        freePreview: document.querySelector('[data-modal-toggle="free-preview"]').classList.contains('active'),
        downloadable: document.querySelector('[data-modal-toggle="downloadable"]').classList.contains('active'),
        commentsEnabled: document.querySelector('[data-modal-toggle="comments"]').classList.contains('active'),
        content: lessonIndex !== null ? courseData.modules[moduleIndex].lessons[lessonIndex].content : {},
        order: lessonIndex !== null ? courseData.modules[moduleIndex].lessons[lessonIndex].order : courseData.modules[moduleIndex].lessons.length
    };
    
    if (lessonIndex !== null) {
        // تعديل درس موجود
        courseData.modules[moduleIndex].lessons[lessonIndex] = lessonData;
    } else {
        // إضافة درس جديد
        if (!courseData.modules[moduleIndex].lessons) {
            courseData.modules[moduleIndex].lessons = [];
        }
        courseData.modules[moduleIndex].lessons.push(lessonData);
    }
    
    await saveCourse();
    updateCurriculum();
    closeModal('lesson-modal');
}

// دالة لتعديل درس
function editLesson(moduleIndex, lessonIndex) {
    const lesson = courseData.modules[moduleIndex].lessons[lessonIndex];
    showLessonModal(lesson.type, moduleIndex, lessonIndex);
}

// دالة لحذف درس
async function deleteLesson(moduleIndex, lessonIndex) {
    if (confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
        courseData.modules[moduleIndex].lessons.splice(lessonIndex, 1);
        
        // إعادة ترتيب الدروس
        courseData.modules[moduleIndex].lessons.forEach((lesson, index) => {
            lesson.order = index;
        });
        
        await saveCourse();
        updateCurriculum();
    }
}

// دالة لمعاينة درس
function previewLesson(moduleIndex, lessonIndex) {
    const lesson = courseData.modules[moduleIndex].lessons[lessonIndex];
    window.open(`lesson-preview.html?courseId=${currentCourseId}&moduleIndex=${moduleIndex}&lessonIndex=${lessonIndex}`, '_blank');
}

// دالة لرفع صورة الغلاف
async function uploadCoverImage(file) {
    if (!file) return;
    
    try {
        updateSaveIndicator('saving');
        
        // رفع الصورة إلى Firebase Storage
        const storageRef = storage.ref();
        const imageRef = storageRef.child(`courses/${currentCourseId}/cover-${Date.now()}.${file.name.split('.').pop()}`);
        
        const snapshot = await imageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        // حفظ رابط الصورة
        courseData.coverImage = downloadURL;
        await saveCourse();
        
        // تحديث العرض
        updateCoverImageDisplay(downloadURL);
        
    } catch (error) {
        console.error('Error uploading image:', error);
        showError('خطأ في رفع الصورة');
    }
}

// دالة لتحديث عرض صورة الغلاف
function updateCoverImageDisplay(imageUrl) {
    const uploadBox = document.querySelector('.image-upload');
    uploadBox.innerHTML = `
        <div class="image-preview">
            <img src="${imageUrl}" alt="Course cover">
            <div class="image-actions">
                <button class="btn btn-icon btn-secondary btn-sm" onclick="changeCover()">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-icon btn-danger btn-sm" onclick="removeCover()">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// دالة لتغيير صورة الغلاف
function changeCover() {
    document.getElementById('cover-upload').click();
}

// دالة لحذف صورة الغلاف
async function removeCover() {
    if (confirm('هل أنت متأكد من حذف صورة الغلاف؟')) {
        courseData.coverImage = '';
        await saveCourse();
        
        // إعادة عرض صندوق الرفع
        const uploadBox = document.querySelector('.image-upload').parentElement;
        uploadBox.innerHTML = `
            <div class="image-upload" onclick="document.getElementById('cover-upload').click()">
                <i class="fas fa-cloud-upload-alt upload-icon"></i>
                <p class="upload-text">اسحب الصورة هنا أو اضغط للاختيار</p>
                <p class="upload-hint">JPG, PNG حتى 5MB • الأبعاد المثالية 1200×600</p>
                <input type="file" id="cover-upload" accept="image/*" style="display: none;">
            </div>
        `;
        
        // إعادة ربط مستمع الحدث
        document.getElementById('cover-upload').addEventListener('change', handleCoverUpload);
    }
}

// دالة للتعامل مع رفع الغلاف
function handleCoverUpload(e) {
    const file = e.target.files[0];
    if (file) {
        // التحقق من حجم الملف
        if (file.size > 5 * 1024 * 1024) {
            showError('حجم الملف يجب أن يكون أقل من 5MB');
            return;
        }
        
        // التحقق من نوع الملف
        if (!file.type.startsWith('image/')) {
            showError('يرجى اختيار ملف صورة');
            return;
        }
        
        uploadCoverImage(file);
    }
}

// دالة لنشر الدورة
async function publishCourse() {
    // التحقق من اكتمال البيانات المطلوبة
    const errors = validateCourse();
    
    if (errors.length > 0) {
        showError('يرجى إكمال البيانات المطلوبة:\n' + errors.join('\n'));
        return;
    }
    
    if (confirm('هل أنت متأكد من نشر الدورة؟ سيتمكن الطلاب من التسجيل فوراً.')) {
        courseData.status = 'published';
        courseData.publishedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        await saveCourse();
        updateUI();
        
        showSuccessMessage('تم نشر الدورة بنجاح!');
    }
}

// دالة للتحقق من صحة بيانات الدورة
function validateCourse() {
    const errors = [];
    
    if (!courseData.title || courseData.title.trim() === '') {
        errors.push('عنوان الدورة مطلوب');
    }
    
    if (!courseData.shortDescription || courseData.shortDescription.trim() === '') {
        errors.push('وصف مختصر للدورة مطلوب');
    }
    
    if (!courseData.modules || courseData.modules.length === 0) {
        errors.push('يجب إضافة وحدة واحدة على الأقل');
    }
    
    // التحقق من وجود دروس في كل وحدة
    let hasLessons = false;
    courseData.modules.forEach(module => {
        if (module.lessons && module.lessons.length > 0) {
            hasLessons = true;
        }
    });
    
    if (!hasLessons) {
        errors.push('يجب إضافة درس واحد على الأقل');
    }
    
    return errors;
}

// دالة لحساب نسبة الإكمال
function calculateProgress() {
    let totalSteps = 10; // عدد الخطوات المطلوبة
    let completedSteps = 0;
    
    // التحقق من المعلومات الأساسية
    if (courseData.title) completedSteps++;
    if (courseData.shortDescription) completedSteps++;
    if (courseData.description) completedSteps++;
    if (courseData.category) completedSteps++;
    if (courseData.coverImage) completedSteps++;
    
    // التحقق من المنهج
    if (courseData.modules && courseData.modules.length > 0) completedSteps++;
    
    let hasLessons = false;
    courseData.modules.forEach(module => {
        if (module.lessons && module.lessons.length > 0) {
            hasLessons = true;
        }
    });
    if (hasLessons) completedSteps++;
    
    // التحقق من الإعدادات
    if (courseData.startDate) completedSteps++;
    if (courseData.accessType) completedSteps++;
    if (courseData.slug) completedSteps++;
    
    const progress = Math.round((completedSteps / totalSteps) * 100);
    
    // تحديث شريط التقدم
    document.querySelector('.progress-fill').style.width = progress + '%';
    document.querySelector('.progress-value').textContent = progress + '%';
    
    // تحديث عدد المهام المكتملة في القائمة الجانبية
    updateSidebarBadges(completedSteps);
}

// دالة لتحديث شارات القائمة الجانبية
function updateSidebarBadges(completedSteps) {
    // يمكن تحديث الشارات هنا حسب الحاجة
}

// دالة لتحديث مؤشر الحفظ
function updateSaveIndicator(status) {
    const indicator = document.querySelector('.auto-save-indicator');
    
    switch (status) {
        case 'saving':
            indicator.className = 'auto-save-indicator saving';
            indicator.innerHTML = '<i class="fas fa-spinner spinning"></i><span>جاري الحفظ...</span>';
            break;
        case 'saved':
            indicator.className = 'auto-save-indicator saved';
            indicator.innerHTML = '<i class="fas fa-check-circle"></i><span>تم الحفظ</span>';
            break;
        case 'error':
            indicator.className = 'auto-save-indicator';
            indicator.innerHTML = '<i class="fas fa-exclamation-circle"></i><span>خطأ في الحفظ</span>';
            break;
    }
}

// دالة لإظهار رسالة النجاح
function showSuccessMessage(message = 'تم الحفظ بنجاح!') {
    const successMessage = document.getElementById('success-message');
    successMessage.querySelector('span').textContent = message;
    successMessage.classList.add('active');
    
    setTimeout(() => {
        successMessage.classList.remove('active');
    }, 3000);
}

// دالة لإظهار رسالة الخطأ
function showError(message) {
    // يمكن استخدام نافذة تنبيه مؤقتاً
    alert(message);
}

// دالة لإغلاق النافذة المنبثقة
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// دالة للتبديل
function toggleSwitch(element) {
    element.classList.toggle('active');
    
    // حفظ الحالة
    const toggleName = element.dataset.toggle;
    if (toggleName) {
        courseData[toggleName] = element.classList.contains('active');
        saveCourse();
    }
}

// دالة لتبديل الوحدة
function toggleModule(button) {
    const moduleContent = button.closest('.module').querySelector('.module-content');
    const icon = button.querySelector('i');
    
    if (moduleContent.style.display === 'none') {
        moduleContent.style.display = 'block';
        icon.className = 'fas fa-chevron-down';
    } else {
        moduleContent.style.display = 'none';
        icon.className = 'fas fa-chevron-up';
    }
}

// معالج أحداث تغيير المدخلات
function handleInputChange(field, value) {
    courseData[field] = value;
    saveCourse();
    
    // تحديث العنوان في الشريط العلوي إذا تغير اسم الدورة
    if (field === 'title') {
        document.querySelector('.course-title-bar h1').textContent = value || 'دورة جديدة';
    }
    
    // توليد رابط تلقائي من العنوان
    if (field === 'title' && !courseData.slug) {
        const slug = value.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-ء-ي]/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
        
        document.querySelector('input[value="malaz-alhayari"]').value = slug;
        courseData.slug = slug;
    }
}

// ربط مستمعي الأحداث عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من تسجيل الدخول
    auth.onAuthStateChanged(user => {
        if (user) {
            // تهيئة الدورة
            initializeCourse();
            
            // ربط مستمعي الأحداث للمدخلات
            bindEventListeners();
        } else {
            // إعادة توجيه لصفحة تسجيل الدخول
            window.location.href = 'login.html';
        }
    });
});

// دالة لربط مستمعي الأحداث
function bindEventListeners() {
    // حفظ تلقائي عند تغيير المدخلات
    document.querySelectorAll('input[type="text"], input[type="url"], textarea, select').forEach(element => {
        element.addEventListener('input', function() {
            updateSaveIndicator('saving');
            
            // تحديد الحقل المناسب
            let field = null;
            let value = this.value;
            
            // تحديد الحقل بناءً على الموقع
            if (this.placeholder === 'أدخل اسم الدورة') field = 'title';
            else if (this.placeholder === 'عنوان فرعي اختياري') field = 'subtitle';
            else if (this.placeholder === 'وصف قصير يظهر في بطاقة الدورة') field = 'shortDescription';
            else if (this.value === 'malaz-alhayari') field = 'slug';
            else if (this.placeholder === 'https://www.youtube.com/watch?v=...') field = 'promoVideo';
            
            if (field) {
                handleInputChange(field, value);
            }
        });
        
        element.addEventListener('change', function() {
            saveCourse();
        });
    });
    
    // رفع صورة الغلاف
    document.getElementById('cover-upload').addEventListener('change', handleCoverUpload);
    
    // زر نشر الدورة
    document.querySelector('.btn-success').addEventListener('click', function() {
        if (courseData.status === 'published') {
            // الدورة منشورة بالفعل، التحويل لوضع التعديل
            window.location.reload();
        } else {
            publishCourse();
        }
    });
    
    // التبديل بين التابات
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // القائمة الجانبية
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // إزالة active من جميع العناصر
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            
            // إضافة active للعنصر المحدد
            this.classList.add('active');
            
            // إخفاء جميع الأقسام
            document.querySelectorAll('.tabs-container, .curriculum-container, .settings-panel').forEach(section => {
                section.style.display = 'none';
            });
            
            // إظهار القسم المطلوب
            const target = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(target);
            if (targetElement) {
                targetElement.style.display = 'block';
                targetElement.classList.add('fade-in');
            }
        });
    });
    
    // التبديلات
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
        toggle.addEventListener('click', function() {
            toggleSwitch(this);
        });
    });
    
    // زر حفظ الدرس في النافذة المنبثقة
    const saveLessonBtn = document.querySelector('.modal-footer .btn-primary');
    if (saveLessonBtn) {
        saveLessonBtn.addEventListener('click', saveLesson);
    }
    
    // إغلاق النوافذ المنبثقة بالضغط على Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
    
    // Drag and Drop للوحدات والدروس
    initializeDragAndDrop();
}

// دالة لتهيئة السحب والإفلات
function initializeDragAndDrop() {
    let draggedElement = null;
    let draggedType = null;
    let draggedIndices = null;
    
    document.addEventListener('dragstart', function(e) {
        if (e.target.classList.contains('module')) {
            draggedElement = e.target;
            draggedType = 'module';
            draggedIndices = {
                module: parseInt(e.target.dataset.moduleIndex)
            };
            e.target.classList.add('dragging');
        } else if (e.target.classList.contains('lesson')) {
            draggedElement = e.target;
            draggedType = 'lesson';
            draggedIndices = {
                module: parseInt(e.target.dataset.moduleIndex),
                lesson: parseInt(e.target.dataset.lessonIndex)
            };
            e.target.classList.add('dragging');
        }
    });
    
    document.addEventListener('dragend', function(e) {
        if (e.target.classList.contains('module') || e.target.classList.contains('lesson')) {
            e.target.classList.remove('dragging');
            draggedElement = null;
            draggedType = null;
            draggedIndices = null;
        }
    });
    
    document.addEventListener('dragover', function(e) {
        e.preventDefault();
        
        if (!draggedElement) return;
        
        // السماح بإسقاط الدروس داخل الوحدات فقط
        if (draggedType === 'lesson') {
            const moduleContent = e.target.closest('.module-content');
            if (!moduleContent) return;
            
            const afterElement = getDragAfterElement(moduleContent, e.clientY);
            if (afterElement == null) {
                moduleContent.insertBefore(draggedElement, moduleContent.querySelector('.add-content-btn'));
            } else {
                moduleContent.insertBefore(draggedElement, afterElement);
            }
        } else if (draggedType === 'module') {
            const container = document.getElementById('modules-container');
            const afterElement = getDragAfterElement(container, e.clientY);
            
            if (afterElement == null) {
                container.insertBefore(draggedElement, container.querySelector('.btn-primary'));
            } else {
                container.insertBefore(draggedElement, afterElement);
            }
        }
    });
    
    document.addEventListener('drop', async function(e) {
        e.preventDefault();
        
        if (!draggedElement || !draggedType || !draggedIndices) return;
        
        if (draggedType === 'module') {
            // إعادة ترتيب الوحدات
            const newOrder = [];
            document.querySelectorAll('.module').forEach((module, index) => {
                const oldIndex = parseInt(module.dataset.moduleIndex);
                newOrder[index] = courseData.modules[oldIndex];
                newOrder[index].order = index;
            });
            
            courseData.modules = newOrder;
            await saveCourse();
            updateCurriculum();
            
        } else if (draggedType === 'lesson') {
            // تحديد الوحدة الجديدة
            const newModuleElement = draggedElement.closest('.module');
            const newModuleIndex = parseInt(newModuleElement.dataset.moduleIndex);
            
            // إزالة الدرس من موقعه القديم
            const oldLesson = courseData.modules[draggedIndices.module].lessons.splice(draggedIndices.lesson, 1)[0];
            
            // تحديد الموقع الجديد
            const lessonsInNewModule = newModuleElement.querySelectorAll('.lesson');
            let newLessonIndex = 0;
            
            for (let i = 0; i < lessonsInNewModule.length; i++) {
                if (lessonsInNewModule[i] === draggedElement) {
                    newLessonIndex = i;
                    break;
                }
            }
            
            // إضافة الدرس في الموقع الجديد
            if (!courseData.modules[newModuleIndex].lessons) {
                courseData.modules[newModuleIndex].lessons = [];
            }
            courseData.modules[newModuleIndex].lessons.splice(newLessonIndex, 0, oldLesson);
            
            // إعادة ترتيب الدروس
            courseData.modules.forEach(module => {
                if (module.lessons) {
                    module.lessons.forEach((lesson, index) => {
                        lesson.order = index;
                    });
                }
            });
            
            await saveCourse();
            updateCurriculum();
        }
    });
}

// دالة مساعدة للحصول على العنصر بعد موقع السحب
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.module:not(.dragging), .lesson:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// دالة لتبديل التاب
function switchTab(tabName) {
    // إخفاء جميع التابات
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // إزالة active من جميع الأزرار
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // إظهار التاب المحدد
    document.getElementById(tabName + '-tab').style.display = 'block';
    
    // إضافة active للزر المحدد
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// تصدير الدوال للاستخدام العام
window.addModule = addModule;
window.editModule = editModule;
window.deleteModule = deleteModule;
window.showContentMenu = showContentMenu;
window.addLesson = addLesson;
window.editLesson = editLesson;
window.deleteLesson = deleteLesson;
window.previewLesson = previewLesson;
window.toggleModule = toggleModule;
window.changeCover = changeCover;
window.removeCover = removeCover;
window.toggleSwitch = toggleSwitch;
window.closeModal = closeModal;
window.switchTab = switchTab;
