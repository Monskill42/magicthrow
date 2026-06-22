(function () {
    const phone = document.getElementById("phone");
    const drawer = document.getElementById("drawer");
    const pages = document.getElementById("pages");
    const dots = Array.from(document.querySelectorAll("#homeDots span"));
    const clock = document.getElementById("clock");
    const fullscreenTip = document.getElementById("fullscreenTip");

    let drawerOpen = false;
    let dragging = false;
    let startY = 0;
    let startX = 0;
    let lastY = 0;
    let baseY = window.innerHeight;
    let currentY = window.innerHeight;
    let pointerId = null;
    let decidingGesture = false;
    let horizontalDragging = false;
    let startScrollLeft = 0;
    let gestureActive = false;
    let lastPointerStart = 0;
    let cardMode = false;
    let cardDragging = false;
    let cardStartX = 0;
    let cardStartY = 0;
    let cardDragStartTime = 0;
    let cardX = 0;
    let cardY = 0;

    let targetX = 0;
    let targetY = 0;

    const card = document.getElementById("magicCard");

    function setClock() {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    }

    function requestFullScreen() {
        const root = document.documentElement;
        const fn = root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen;
        if (!document.fullscreenElement && fn) {
            Promise.resolve(fn.call(root)).then(hideTip).catch(showTip);
        }
    }

    function showTip() {
        fullscreenTip.classList.add("show");
        window.setTimeout(hideTip, 2800);
    }

    function hideTip() {
        fullscreenTip.classList.remove("show");
    }

    function drawerHeight() {
        return window.innerHeight;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function moveDrawer(y, animated) {
        currentY = clamp(y, 0, drawerHeight());
        drawer.classList.toggle("animating", Boolean(animated));
        drawer.style.transform = `translateY(${currentY}px)`;
    }

    function openDrawer(animated = true) {
        drawerOpen = true;
        moveDrawer(0, animated);
    }

    function closeDrawer(animated = true) {
        drawerOpen = false;
        moveDrawer(drawerHeight(), animated);
    }

    function finishDrag() {
        const total = drawerHeight();
        const moved = lastY - startY;
        const fastUp = moved < -80;
        const fastDown = moved > 80;

        dragging = false;
        pointerId = null;

        if (fastUp || currentY < total * 0.48) {
            openDrawer(true);
        } else if (fastDown || currentY >= total * 0.48) {
            closeDrawer(true);
        }
    }

    function beginGesture(x, y, target, id) {
        if (cardMode) return;
        requestFullScreen();

        startY = y;
        startX = x;
        lastY = startY;
        baseY = drawerOpen ? 0 : drawerHeight();
        startScrollLeft = pages.scrollLeft;
        decidingGesture = true;
        horizontalDragging = false;
        gestureActive = true;
        pointerId = id;
        drawer.classList.remove("animating");
    }

    function updateGesture(x, y, target) {
        if (cardMode) return;
        if (!gestureActive) return;

        const dx = Math.abs(x - startX);
        const dy = Math.abs(y - startY);

        if (decidingGesture && dx + dy > 10) {
            const fromDrawer = Boolean(target.closest(".drawer"));
            const canOpenDrawer = startY > window.innerHeight * 0.34;
            dragging = dy >= dx && (drawerOpen || fromDrawer || canOpenDrawer);
            horizontalDragging = !drawerOpen && dx > dy;
            decidingGesture = false;
        }

        if (horizontalDragging) {
            pages.scrollLeft = startScrollLeft - (x - startX);
            return;
        }

        if (!dragging) return;

        lastY = y;
        moveDrawer(baseY + (y - startY), false);
    }

    function endGesture() {
        if (cardMode) return;
        if (!gestureActive) return;

        if (horizontalDragging) {
            const page = Math.round(pages.scrollLeft / pages.clientWidth);
            pages.scrollTo({ left: page * pages.clientWidth, behavior: "smooth" });
        } else if (dragging) {
            finishDrag();
        }

        dragging = false;
        decidingGesture = false;
        horizontalDragging = false;
        pointerId = null;
        gestureActive = false;
    }

    phone.addEventListener("pointerdown", (event) => {
        lastPointerStart = Date.now();
        beginGesture(event.clientX, event.clientY, event.target, event.pointerId);
        phone.setPointerCapture(event.pointerId);
    });

    window.addEventListener("pointermove", (e) => {

        if (!cardDragging) return;

        targetX = e.clientX;
        targetY = e.clientY;

    });

    phone.addEventListener("pointerup", (event) => {
        if (event.pointerId !== pointerId) return;
        endGesture();
    });

    phone.addEventListener("mousedown", (event) => {
        if (Date.now() - lastPointerStart < 650) return;
        beginGesture(event.clientX, event.clientY, event.target, "mouse");
    });

    window.addEventListener("mousemove", (event) => {
        if (pointerId !== "mouse") return;
        updateGesture(event.clientX, event.clientY, event.target);
    });

    window.addEventListener("mouseup", () => {
        if (pointerId !== "mouse") return;
        endGesture();
    });

    phone.addEventListener("touchstart", (event) => {
        if (Date.now() - lastPointerStart < 650 || !event.touches.length) return;
        const touch = event.touches[0];
        beginGesture(touch.clientX, touch.clientY, event.target, "touch");
    }, { passive: true });

    phone.addEventListener("touchmove", (event) => {
        if (pointerId !== "touch" || !event.touches.length) return;
        const touch = event.touches[0];
        updateGesture(touch.clientX, touch.clientY, event.target);
        if (dragging || horizontalDragging) event.preventDefault();
    }, { passive: false });

    phone.addEventListener("touchend", () => {
        if (pointerId !== "touch") return;
        endGesture();
    });

    phone.addEventListener("pointercancel", () => {
        if (!dragging && !horizontalDragging) return;
        dragging = false;
        decidingGesture = false;
        horizontalDragging = false;
        drawerOpen ? openDrawer(true) : closeDrawer(true);
    });

    phone.addEventListener("wheel", (event) => {
        if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
        if (event.deltaY < -20) openDrawer(true);
        if (event.deltaY > 20 && drawerOpen) closeDrawer(true);
    }, { passive: true });

    pages.addEventListener("scroll", () => {
        const index = Math.round(pages.scrollLeft / pages.clientWidth);
        dots.forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === index));
    }, { passive: true });

    fullscreenTip.addEventListener("click", requestFullScreen);

    window.addEventListener("resize", () => {
        drawerOpen ? openDrawer(false) : closeDrawer(false);
    });
    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (SpeechRecognition) {

        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {

            const text =
                event.results[event.results.length - 1][0]
                    .transcript
                    .toLowerCase();

            if (text.includes("throw")) {
                showCard();
            }
        };

        recognition.start();
    }
    function animateCard() {

        cardX += (targetX - cardX) * 0.18;
        cardY += (targetY - cardY) * 0.18;

        if (cardDragging) {

            const phoneRect =
                document.querySelector(".phone")
                    .getBoundingClientRect();

            card.style.transform = `
translate(
${cardX - (phoneRect.left + phoneRect.width / 2)}px,
${cardY - (phoneRect.top + phoneRect.height / 2)}px
)
rotate(0deg)
scale(1)
`;
        }

        requestAnimationFrame(animateCard);
    }

    animateCard();
    function showCard() {

        if (cardMode) return;

        cardMode = true;

        drawer.style.pointerEvents = "none";
        pages.style.pointerEvents = "none";

        card.classList.add("active");

    }

    function hideCard() {

        card.style.transition =
            "transform .7s cubic-bezier(.22,1,.36,1), opacity .7s";

        card.style.transform = `
    translate(900px,-50%)
    rotate(120deg)
    scale(.05)
    `;

        card.style.opacity = "0";

        setTimeout(() => {

            card.classList.remove("active");

            card.style.transition = "";

            card.style.opacity = "";

            card.style.transform = `
        translate(-50%,120vh)
        rotate(-25deg)
        scale(.2)
        `;

            cardMode = false;

            drawer.style.pointerEvents = "";
            pages.style.pointerEvents = "";

        }, 700);
    }
    card.addEventListener("pointerdown", (e) => {

        if (!cardMode) return;

        cardDragging = true;

        cardStartX = e.clientX;
        cardStartY = e.clientY;

        cardDragStartTime = Date.now();

        card.style.transition = "none";
    });

    window.addEventListener("pointermove", (e) => {

        if (!cardDragging) return;

        const phoneRect = document
            .querySelector(".phone")
            .getBoundingClientRect();

        const cardWidth = 180;
        const cardHeight = 240;

        targetX = Math.max(
            phoneRect.left + cardWidth / 2,
            Math.min(
                e.clientX,
                phoneRect.right - cardWidth / 2
            )
        );

        targetY = Math.max(
            phoneRect.top + cardHeight / 2,
            Math.min(
                e.clientY,
                phoneRect.bottom - cardHeight / 2
            )
        );
        if (
            e.clientX < phoneRect.left ||
            e.clientX > phoneRect.right
        ) {
            card.style.scale = ".96";
        } else {
            card.style.scale = "1";
        }

    });

    window.addEventListener("pointerup", (e) => {

        if (!cardDragging) return;

        cardDragging = false;

        const distance =
            e.clientX - cardStartX;

        const time =
            Date.now() - cardDragStartTime;

        const velocity =
            distance / time;

        if (velocity > 1.3) {

            hideCard();
        }

    });
    setClock();
    setInterval(setClock, 10000);
    closeDrawer(false);
    window.setTimeout(requestFullScreen, 250);
    window.setTimeout(() => {
        if (!document.fullscreenElement) showTip();
    }, 900);
})();
