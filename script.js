(function () {
    const phone = document.getElementById("phone");
    const drawer = document.getElementById("drawer");
    const pages = document.getElementById("pages");
    const dots = Array.from(document.querySelectorAll("#homeDots span"));
    const clock = document.getElementById("clock");
    const fullscreenTip = document.getElementById("fullscreenTip");
    const cardLayer = document.getElementById("cardLayer");
    const foldedCard = document.getElementById("foldedCard");

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
    let cardPointerId = null;
    let cardX = 0;
    let cardY = 0;
    let cardStartX = 0;
    let cardStartY = 0;
    let cardBaseX = 0;
    let cardBaseY = 0;
    let cardTargetX = 0;
    let cardTargetY = 0;
    let cardTargetRotation = -7;
    let cardRenderedX = 0;
    let cardRenderedY = 0;
    let cardRenderedRotation = -7;
    let cardRaf = null;
    let cardHistory = [];
    let longPressTimer = null;
let longPressTriggered = false;
let pinchStartDistance = 0;
let pinchActive = false;

    
function getDistance(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;

    return Math.sqrt(dx * dx + dy * dy);
}
function startLongPress() {
    longPressTriggered = false;

    clearTimeout(longPressTimer);

    longPressTimer = setTimeout(() => {
        longPressTriggered = true;
        showFoldedCard();
    }, 3000); // 3 seconds
}

function cancelLongPress() {
    clearTimeout(longPressTimer);
}
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

    function applyCardTransform(x, y, rotation) {
        foldedCard.style.setProperty("--card-x", `${x}px`);
        foldedCard.style.setProperty("--card-y", `${y}px`);
        foldedCard.style.setProperty("--card-rotate", `${rotation}deg`);
    }

    function stopCardMotion() {
        if (!cardRaf) return;
        cancelAnimationFrame(cardRaf);
        cardRaf = null;
    }

    function renderCardMotion() {
        const ease = cardDragging ? .34 : .22;
        cardRenderedX += (cardTargetX - cardRenderedX) * ease;
        cardRenderedY += (cardTargetY - cardRenderedY) * ease;
        cardRenderedRotation += (cardTargetRotation - cardRenderedRotation) * ease;
        applyCardTransform(cardRenderedX, cardRenderedY, cardRenderedRotation);

        const stillMoving = Math.abs(cardTargetX - cardRenderedX) > .2 ||
            Math.abs(cardTargetY - cardRenderedY) > .2 ||
            Math.abs(cardTargetRotation - cardRenderedRotation) > .2;

        if (cardDragging || stillMoving) {
            cardRaf = requestAnimationFrame(renderCardMotion);
        } else {
            cardRaf = null;
        }
    }

    function setCardPosition(x, y, rotation, immediate = false) {
        cardX = x;
        cardY = y;
        cardTargetX = x;
        cardTargetY = y;
        cardTargetRotation = rotation;

        if (immediate) {
            stopCardMotion();
            cardRenderedX = x;
            cardRenderedY = y;
            cardRenderedRotation = rotation;
            applyCardTransform(x, y, rotation);
            return;
        }

        if (!cardRaf) cardRaf = requestAnimationFrame(renderCardMotion);
    }

    function showFoldedCard() {
        
        if (cardMode) return;

        closeDrawer(true);
        cardMode = true;
        cardDragging = false;
        cardPointerId = null;
        cardHistory = [];
        document.body.classList.add("card-mode");
        cardLayer.classList.add("active");
        cardLayer.setAttribute("aria-hidden", "false");
        foldedCard.classList.remove("dragging", "throwing");
        foldedCard.style.setProperty("--card-scale", "1");
        setCardPosition(0, 0, -7, true);
        requestAnimationFrame(() => {
            foldedCard.style.setProperty("--card-scale", "1.1");
            setCardPosition(0, 0, -7);
        });
    }

    function hideFoldedCard(thrown) {
        if (!cardMode) return;

        cardDragging = false;
        cardPointerId = null;
        foldedCard.classList.remove("dragging");

        if (thrown) {
            stopCardMotion();
            foldedCard.classList.add("throwing");
            foldedCard.style.setProperty("--card-scale", ".56");
            setCardPosition(window.innerWidth * .92, cardY - 26, 18, true);
        }

        window.setTimeout(() => {
            cardMode = false;
            
            cardLayer.classList.remove("active");
            cardLayer.setAttribute("aria-hidden", "true");
            foldedCard.classList.remove("throwing");
            document.body.classList.remove("card-mode");
            foldedCard.style.setProperty("--card-scale", "1");
            requestAnimationFrame(() => setCardPosition(0, 0, -7, true));
        }, thrown ? 520 : 0);
    }

    function beginCardDrag(event) {
        if (!cardMode) return;

        event.preventDefault();
        event.stopPropagation();
        cardDragging = true;
        cardPointerId = event.pointerId;
        cardStartX = event.clientX;
        cardStartY = event.clientY;
        cardBaseX = cardX;
        cardBaseY = cardY;
        cardTargetX = cardX;
        cardTargetY = cardY;
        cardTargetRotation = clamp(cardX / 30, -14, 14) - 7;
        cardRenderedX = cardX;
        cardRenderedY = cardY;
        cardRenderedRotation = cardTargetRotation;
        cardHistory = [{ x: event.clientX, y: event.clientY, time: performance.now() }];
        foldedCard.classList.add("dragging");
        foldedCard.style.setProperty("--card-scale", "1.035");
        foldedCard.setPointerCapture(event.pointerId);
    }

    function moveCard(event) {
        if (!cardDragging || event.pointerId !== cardPointerId) return;

        event.preventDefault();
        event.stopPropagation();
        const nextX = cardBaseX + event.clientX - cardStartX;
        const nextY = cardBaseY + event.clientY - cardStartY;
        const rotation = clamp(nextX / 30, -14, 14) + clamp((event.clientY - cardStartY) / 70, -4, 4) - 7;
        setCardPosition(nextX, nextY, rotation);

        const now = performance.now();
        cardHistory.push({ x: event.clientX, y: event.clientY, time: now });
        cardHistory = cardHistory.filter((point) => now - point.time < 180);
    }

    function endCardDrag(event) {
        if (!cardDragging || event.pointerId !== cardPointerId) return;

        event.preventDefault();
        event.stopPropagation();
        foldedCard.classList.remove("dragging");
        foldedCard.style.setProperty("--card-scale", "1");
        cardDragging = false;

        const first = cardHistory[0];
        const last = cardHistory[cardHistory.length - 1];
        const time = Math.max(1, last.time - first.time);
        const velocityX = (last.x - first.x) / time;
        const movedRight = last.x - first.x;
        const throwAway = movedRight > Math.min(92, window.innerWidth * .22) && velocityX > .62;

        if (throwAway) {
            hideFoldedCard(true);
        } else {
            setCardPosition(cardX, cardY, clamp(cardX / 30, -14, 14) - 7);
        }

        cardPointerId = null;
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
        startLongPress();
    }

    function updateGesture(x, y, target) {
        if (
    Math.abs(x - startX) > 15 ||
    Math.abs(y - startY) > 15
) {
    cancelLongPress();
}

        if (!gestureActive) return;

        const dx = Math.abs(x - startX);
        const dy = Math.abs(y - startY);

        if (decidingGesture && dx + dy > 10) {
            const fromDrawer = Boolean(target.closest && target.closest(".drawer"));
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
        cancelLongPress();
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
        if (cardMode) return;
        lastPointerStart = Date.now();
        beginGesture(event.clientX, event.clientY, event.target, event.pointerId);
        phone.setPointerCapture(event.pointerId);
    });

    phone.addEventListener("pointermove", (event) => {
        if (event.pointerId !== pointerId) return;
        updateGesture(event.clientX, event.clientY, event.target);
    });

    phone.addEventListener("pointerup", (event) => {
        if (event.pointerId !== pointerId) return;
        endGesture();
    });

    phone.addEventListener("mousedown", (event) => {
        if (cardMode) return;
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
        if (cardMode) return;
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
        cancelLongPress();
        if (!dragging && !horizontalDragging) return;
        dragging = false;
        decidingGesture = false;
        horizontalDragging = false;
        drawerOpen ? openDrawer(true) : closeDrawer(true);
    });
    phone.addEventListener("touchstart", (e) => {

    if (e.touches.length === 2) {

        pinchActive = true;

        pinchStartDistance = getDistance(
            e.touches[0],
            e.touches[1]
        );

    }

}, { passive: true });


phone.addEventListener("touchmove", (e) => {

    if (!pinchActive) return;

    if (e.touches.length !== 2) return;

    const distance = getDistance(
        e.touches[0],
        e.touches[1]
    );

    const diff = distance - pinchStartDistance;

    if (!cardMode && diff > 30) {

        const centerX =
            (e.touches[0].clientX + e.touches[1].clientX) / 2;

        const centerY =
            (e.touches[0].clientY + e.touches[1].clientY) / 2;

        showFoldedCard();

        requestAnimationFrame(() => {

            setCardPosition(
                centerX - window.innerWidth / 2,
                centerY - window.innerHeight / 2,
                -7,
                true
            );

        });

        pinchActive = false;
    }

}, { passive: true });
foldedCard.addEventListener("touchstart", (e) => {

    if (e.touches.length === 2) {

        pinchActive = true;

        pinchStartDistance = getDistance(
            e.touches[0],
            e.touches[1]
        );


    }

}, { passive: true });


foldedCard.addEventListener("touchmove", (e) => {

    if (!cardMode) return;

    if (!pinchActive) return;

    if (e.touches.length !== 2) return;

    const distance = getDistance(
        e.touches[0],
        e.touches[1]
    );
    const scale = Math.max(
    0.6,
    distance / pinchStartDistance
);

foldedCard.style.transform =
    `translate(${cardX}px, ${cardY}px)
     rotate(-7deg)
     scale(${scale})`;

    const diff = pinchStartDistance - distance;

    if (diff > 30) {

        hideFoldedCard(false);

        pinchActive = false;
    }

}, { passive: true });
foldedCard.addEventListener("touchend", () => {

    pinchActive = false;

    foldedCard.style.transform = "";

});

foldedCard.addEventListener("touchend", () => {
    pinchActive = false;
});

    phone.addEventListener("wheel", (event) => {
        if (cardMode) return;
        if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
        if (event.deltaY < -20) openDrawer(true);
        if (event.deltaY > 20 && drawerOpen) closeDrawer(true);
    }, { passive: true });

    pages.addEventListener("scroll", () => {
        const index = Math.round(pages.scrollLeft / pages.clientWidth);
        dots.forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === index));
    }, { passive: true });

    fullscreenTip.addEventListener("click", () => {
        requestFullScreen();
        
    });

    foldedCard.addEventListener("pointerdown", beginCardDrag);
    foldedCard.addEventListener("pointermove", moveCard);
    foldedCard.addEventListener("pointerup", endCardDrag);
    foldedCard.addEventListener("pointercancel", endCardDrag);

    window.addEventListener("keydown", (event) => {
        if (event.key.toLowerCase() === "t") showFoldedCard();
    });

    window.addEventListener("throw-card", showFoldedCard);

    window.addEventListener("resize", () => {
        drawerOpen ? openDrawer(false) : closeDrawer(false);
    });

    setClock();
    setInterval(setClock, 10000);
    closeDrawer(false);
    window.setTimeout(requestFullScreen, 250);
    window.setTimeout(() => {
        if (!document.fullscreenElement) showTip();
    }, 900);
})();
