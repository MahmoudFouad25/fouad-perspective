// Course Builder - Firebase Integration
console.log('🚀 بدء تحميل Course Builder Firebase...');

// انتظار تحميل الصفحة و Firebase
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من Firebase بعد ثانية
    setTimeout(initializeCourseBuilder, 1000);
});

// متغيرات عامة
let currentCourseId = null;
let currentCourseData = {
    title: '',
    subtitle: '',
    description: '',
    modules: []
};

// تهيئة Course Builder
function initializeCourseBuilder() {
    console.log('🔧 تهيئة Course Builder...');
    
    // التحقق من Firebase
    if (typeof firebase === 'undefined' || typeof db === 'undefined') {
        console.error('❌ Firebase غير متاح!');
        setTimeout(initializeCourseBuilder, 500);
        return;
    }
    
    console.log('✅ Firebase جاهز');
    
    // التحقق من الصفحة الحالية
    if (window.location.pathname.includes('course-preview.html')) {
        initializePreviewPage();
    } else if (window.location.pathname.includes('course-builder.html')) {
        initializeBuilderPage();
    }
}

// تهيئة صفحة المعاينة
function initializePreviewPage() {
    console.log('📄 تهيئة صفحة المعاينة...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    
    if (courseId) {
        loadCourseForPreview(courseId);
    }
}

// تهيئة صفحة البناء
function initializeBuilderPage() {
    console.log('🏗️ تهيئة صفحة البناء...');
    
    // تحميل بيانات الدورة إن وجدت
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');
    
    if (courseId && courseId !== 'new') {
        currentCourseId = courseId;
        loadCourseData(courseId);
    }
    
    // ربط الأزرار
    setupEventListeners();
    
    // تفعيل الحفظ التلقائي
    enableAutoSave();
}

// تحميل بيانات الدورة للمعاينة
async function loadCourseForPreview(courseId) {
    try {
        const doc = await db.collection('courses').doc(courseId).get();
        
        if (doc.exists) {
            const courseData = doc.data();
            console.log('✅ تم تحميل بيانات الدورة:', courseData);
            
            // تحديث عناصر الصفحة
            if (document.getElementById('course-title')) {
                document.getElementById('course-title').textContent = courseData.title || 'دورة جديدة';
            }
            
            // يمكنك إضافة المزيد من العناصر هنا
        } else {
            console.error('❌ الدورة غير موجودة');
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل الدورة:', error);
    }
}

// تحميل بيانات الدورة للتحرير
async function loadCourseData(courseId) {
    try {
        console.log('📥 تحميل بيانات الدورة...');
        
        const doc = await db.collection('courses').doc(courseId).get();
        
        if (doc.exists) {
            currentCourseData = doc.data();
            console.log('✅ تم تحميل الدورة:', currentCourseData);
            
            // تحديث الواجهة
            updateUIWithCourseData();
        } else {
            console.warn('⚠️ الدورة غير موجودة');
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
    }
}

// تحديث الواجهة بالبيانات
function updateUIWithCourseData() {
    // تحديث العنوان
    const titleInput = document.querySelector('input[placeholder*="اسم الدورة"]');
    if (titleInput && currentCourseData.title) {
        titleInput.value = currentCourseData.title;
    }
    
    // تحديث العنوان الفرعي
    const subtitleInput = document.querySelector('input[placeholder*="عنوان فرعي"]');
    if (subtitleInput && currentCourseData.subtitle) {
        subtitleInput.value = currentCourseData.subtitle;
    }
    
    // تحديث الوصف
    const descriptionTextarea = document.querySelector('textarea[placeholder*="وصف"]');
    if (descriptionTextarea && currentCourseData.description) {
        descriptionTextarea.value = currentCourseData.description;
    }
    
    // تحديث الوحدات
    if (currentCourseData.modules && currentCourseData.modules.length > 0) {
        displayModules();
    }
}

// عرض الوحدات
function displayModules() {
    const modulesContainer = document.getElementById('modules-container');
    if (!modulesContainer) return;
    
    // مسح المحتوى الحالي
    modulesContainer.innerHTML = '';
    
    // إضافة كل وحدة
    currentCourseData.modules.forEach((module, index) => {
        const moduleElement = createModuleElement(module, index);
        modulesContainer.appendChild(moduleElement);
    });
}

// إنشاء عنصر الوحدة
function createModuleElement(module, index) {
    const moduleDiv = document.createElement('div');
    moduleDiv.className = 'module fade-in';
    moduleDiv.draggable = true;
    moduleDiv.innerHTML = `
        <div class="module-header">
            <i class="fas fa-grip-vertical drag-handle"></i>
            <div class="module-info">
                <h4 class="module-title">${module.title}</h4>
                <div class="module-meta">
                    <span><i class="fas fa-book-open"></i> ${module.lessons ? module.lessons.length : 0} دروس</span>
                    <span><i class="fas fa-clock"></i> ${module.duration || 0} دقيقة</span>
                </div>
            </div>
            <div class="module-actions">
                <button class="btn btn-icon btn-secondary" onclick="editModule(${index})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-icon btn-secondary" onclick="deleteModule(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="module-content">
            <!-- دروس الوحدة -->
            <button class="add-content-btn" onclick="showContentMenu(this)">
                <i class="fas fa-plus"></i>
                إضافة محتوى
            </button>
        </div>
    `;
    
    return moduleDiv;
}

// ربط مستمعي الأحداث
function setupEventListeners() {
    // زر حفظ الدورة
    const saveBtn = document.querySelector('.btn-primary:has(.fa-save)');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCourse);
    }
    
    // زر نشر الدورة
    const publishBtn = document.querySelector('.btn-success:has(.fa-rocket)');
    if (publishBtn) {
        publishBtn.addEventListener('click', publishCourse);
    }
    
    // زر المعاينة
    const previewBtn = document.querySelector('.btn-secondary:has(.fa-eye)');
    if (previewBtn) {
        previewBtn.addEventListener('click', previewCourse);
    }
}

// حفظ الدورة
async function saveCourse() {
    try {
        console.log('💾 جاري حفظ الدورة...');
        
        // جمع البيانات من الواجهة
        collectDataFromUI();
        
        // إضافة الوقت
        currentCourseData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        if (currentCourseId) {
            // تحديث دورة موجودة
            await db.collection('courses').doc(currentCourseId).update(currentCourseData);
            console.log('✅ تم تحديث الدورة');
        } else {
            // إنشاء دورة جديدة
            currentCourseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection('courses').add(currentCourseData);
            currentCourseId = docRef.id;
            
            // تحديث URL
            window.history.replaceState({}, '', `?id=${currentCourseId}`);
            console.log('✅ تم إنشاء دورة جديدة:', currentCourseId);
        }
        
        showSuccessMessage('تم حفظ الدورة بنجاح!');
        
    } catch (error) {
        console.error('❌ خطأ في الحفظ:', error);
        alert('حدث خطأ في الحفظ: ' + error.message);
    }
}

// جمع البيانات من الواجهة
function collectDataFromUI() {
    // العنوان
    const titleInput = document.querySelector('input[placeholder*="اسم الدورة"]');
    if (titleInput) {
        currentCourseData.title = titleInput.value;
    }
    
    // العنوان الفرعي
    const subtitleInput = document.querySelector('input[placeholder*="عنوان فرعي"]');
    if (subtitleInput) {
        currentCourseData.subtitle = subtitleInput.value;
    }
    
    // الوصف
    const descriptionTextarea = document.querySelector('textarea[placeholder*="وصف"]');
    if (descriptionTextarea) {
        currentCourseData.description = descriptionTextarea.value;
    }
    
    // يمكن إضافة المزيد من الحقول هنا
}

// نشر الدورة
async function publishCourse() {
    if (!currentCourseId) {
        alert('يرجى حفظ الدورة أولاً');
        return;
    }
    
    if (confirm('هل أنت متأكد من نشر الدورة؟')) {
        try {
            await db.collection('courses').doc(currentCourseId).update({
                status: 'published',
                publishedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showSuccessMessage('تم نشر الدورة بنجاح!');
            
            // تحديث الواجهة
            const statusBadge = document.querySelector('.status-badge');
            if (statusBadge) {
                statusBadge.className = 'status-badge published';
                statusBadge.innerHTML = '<i class="fas fa-circle"></i> منشورة';
            }
            
        } catch (error) {
            console.error('❌ خطأ في النشر:', error);
            alert('حدث خطأ في نشر الدورة');
        }
    }
}

// معاينة الدورة
async function previewCourse() {
    // حفظ أولاً
    await saveCourse();
    
    if (currentCourseId) {
        window.open(`course-preview.html?courseId=${currentCourseId}`, '_blank');
    }
}

// الحفظ التلقائي
function enableAutoSave() {
    let saveTimeout;
    
    // مراقبة جميع الحقول
    document.addEventListener('input', function(e) {
        if (e.target.matches('input, textarea, select')) {
            clearTimeout(saveTimeout);
            
            // إظهار مؤشر الحفظ
            updateSaveIndicator('saving');
            
            // الحفظ بعد ثانيتين من التوقف عن الكتابة
            saveTimeout = setTimeout(async () => {
                await saveCourse();
                updateSaveIndicator('saved');
            }, 2000);
        }
    });
}

// تحديث مؤشر الحفظ
function updateSaveIndicator(status) {
    const indicator = document.querySelector('.auto-save-indicator');
    if (!indicator) return;
    
    if (status === 'saving') {
        indicator.className = 'auto-save-indicator saving';
        indicator.innerHTML = '<i class="fas fa-spinner spinning"></i><span>جاري الحفظ...</span>';
    } else if (status === 'saved') {
        indicator.className = 'auto-save-indicator saved';
        indicator.innerHTML = '<i class="fas fa-check-circle"></i><span>تم الحفظ</span>';
    }
}

// إظهار رسالة النجاح
function showSuccessMessage(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.querySelector('span').textContent = message;
        successDiv.classList.add('active');
        
        setTimeout(() => {
            successDiv.classList.remove('active');
        }, 3000);
    }
}

// وظائف الوحدات (يجب أن تكون عامة)
window.addModule = function() {
    const title = prompt('أدخل عنوان الوحدة الجديدة:');
    if (!title) return;
    
    if (!currentCourseData.modules) {
        currentCourseData.modules = [];
    }
    
    currentCourseData.modules.push({
        title: title,
        lessons: [],
        duration: 0,
        createdAt: new Date()
    });
    
    displayModules();
    saveCourse();
};

window.editModule = function(index) {
    const module = currentCourseData.modules[index];
    const newTitle = prompt('تعديل عنوان الوحدة:', module.title);
    
    if (newTitle && newTitle !== module.title) {
        module.title = newTitle;
        displayModules();
        saveCourse();
    }
};

window.deleteModule = function(index) {
    if (confirm('هل أنت متأكد من حذف هذه الوحدة؟')) {
        currentCourseData.modules.splice(index, 1);
        displayModules();
        saveCourse();
    }
};

console.log('✅ Course Builder Firebase جاهز!');
