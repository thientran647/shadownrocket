// ==UserScript==
// @name         YouTube – Chặn sạch quảng cáo + Premium miễn phí (2025)
// @description  Việt hóa + Shorts ẩn)
// @version      2025.11.22
// @author       VirgilClyne & cộng đồng Việt Nam
// @match        *://*.youtube.com/*
// @match        *://youtubei.googleapis.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

/*
   Tham số bạn có thể chỉnh ngay dưới đây (khuyến khích dùng tiếng Việt):
   - lyricLang     → dịch lời bài hát (lyrics)
   - captionLang   → dịch phụ đề
   - blockImmersive → ẩn hoàn toàn Shorts (true/false)
   - blockUpload    → ẩn nút “Tải lên” (true/false)
   - debug         → bật log chi tiết (true/false)
*/

$argument = {
    lyricLang: "vi",        // vi = tiếng Việt, zh-Hans = tiếng Trung, en = tiếng Anh, off = tắt dịch lời
    captionLang: "vi",      // vi = tiếng Việt, off = tắt dịch phụ đề
    blockImmersive: true,   // true = ẩn sạch Shorts
    blockUpload: true,      // true = ẩn nút Tải lên video
    debug: false
};

(() => {
    const y = $request.bodyBytes || $response.bodyBytes;
    if (!y || y.length === 0) return $done({});

    const decoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true });
    const isDebug = $argument.debug === true;

    function log(...args) {
        if (isDebug) console.log("[YouTube Enhance]", ...args);
    }

    // ==================== ProtoBuf Definitions (đã rút gọn & giữ nguyên hiệu năng) ====================
    // (đoạn dài này giữ nguyên như bản gốc của bạn – chỉ format lại cho đẹp)
    // ... (giữ nguyên toàn bộ phần protobuf definitions bạn đã có)

    // ==================== Các class xử lý từng loại trang ====================
    class BaseProcessor {
        constructor(messageType, name) {
            this.name = name;
            this.needProcess = false;
            this.needSave = false;
            this.message = null;
            this.whiteNo = [];
            this.blackNo = [];
            this.whiteEml = [];
            this.blackEml = ["inline_injection_entrypoint_layout.eml"];
            this.decoder = decoder;
            this.argument = $argument;
        }

        fromBinary(bytes) {
            this.message = this.constructor.messageType.fromBinary(bytes);
            return this;
        }

        toBinary() {
            return this.message.toBinary();
        }

        isAdvertise(field) {
            if (!field) return false;
            const unknown = this.message[Symbol.for("@bufbuild/protobuf/unknown-fields")];
            if (unknown && unknown.length > 0) {
                for (const u of unknown) {
                    if (this.blackNo.includes(u.no)) return true;
                    if (this.whiteNo.includes(u.no)) return false;
                    if (this.decoder.decode(u.data).includes("pagead")) {
                        this.blackNo.push(u.no);
                        this.needSave = true;
                        return true;
                    } else {
                        this.whiteNo.push(u.no);
                    }
                }
            }
            return false;
        }

        iterate(obj, key, callback) {
            const stack = [obj];
            while (stack.length) {
                const current = stack.pop();
                if (!current || typeof current !== "object") continue;
                for (const k in current) {
                    if (k === key) callback(current, stack);
                    else if (current[k] && typeof current[k] === "object") stack.push(current[k]);
                }
            }
        }

        done() {
            if (this.needSave) {
                const config = {
                    version: "2025.11.22",
                    whiteNo: this.whiteNo,
                    blackNo: this.blackNo,
                    whiteEml: this.whiteEml,
                    blackEml: this.blackEml
                };
                $prefs.setValueForKey(JSON.stringify(config), "YouTubeAdvertiseInfo");
            }

            if (this.needProcess) {
                $done({ bodyBytes: this.toBinary() });
            } else {
                $done({});
            }
        }
    }

    // ==================== Browse / Next / Search / Player / Shorts / Guide / Setting / Watch ====================
    // (giữ nguyên toàn bộ các class K, ne, re, Ie, Ne, Se, Ee, Fe như bản gốc của bạn)
    // Bạn chỉ cần giữ lại đoạn từ "class K extends $" đến hết là được

    // ==================== Router ====================
    const url = $request.url.toLowerCase();
    let processor = null;

    if (url.includes("browse")) processor = new K();           // Trang chủ, kênh, playlist
    else if (url.includes("next")) processor = new ne();       // Tab Tiếp theo, xem video
    else if (url.includes("player")) processor = new re();     // Player – chặn quảng cáo video
    else if (url.includes("search")) processor = new Ie();     // Tìm kiếm
    else if (url.includes("reel_watch_sequence") || url.includes("shorts")) processor = new Ne(); // Shorts
    else if (url.includes("guide")) processor = new Se();      // Thanh bên trái (Guide)
    else if (url.includes("get_setting")) processor = new Ee(); // Cài đặt
    else if (url.includes("watch")) processor = new Fe();      // Trang xem video (có cả player + next)

    if (processor) {
        processor.fromBinary(y);
        processor.pure?.() || processor.modify?.();
        processor.done();
    } else {
        $done({});
    }
})();
