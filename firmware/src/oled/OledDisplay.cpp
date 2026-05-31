#ifdef HAS_OLED
#include "OledDisplay.h"
#include <Wire.h>

#define SCREEN_WIDTH OLED_WIDTH
#define SCREEN_HEIGHT OLED_HEIGHT
#define OLED_RESET -1

static Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
static OledState currentState = OLED_BOOTING;
static String currentIP = "---";
static bool artNetActive = false;
static uint32_t lastUpdate = 0;
static uint8_t animFrame = 0;

void oledInit() {
    Wire.begin(OLED_SDA, OLED_SCL);
    if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) return;
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("LED Controller");
    display.println("Demarrage...");
    display.display();
}

void oledSetState(OledState state) { currentState = state; }
void oledSetIP(const String& ip) { currentIP = ip; }
void oledSetArtNetActive(bool active) { artNetActive = active; }

void oledUpdate() {
    uint32_t now = millis();
    if (now - lastUpdate < 500) return;
    lastUpdate = now;
    animFrame = (animFrame + 1) % 4;

    display.clearDisplay();
    display.setTextSize(1);

    switch (currentState) {
        case OLED_BOOTING:
            display.setCursor(0, 0); display.println("LED Controller");
            display.setCursor(0, 12); display.print("Boot");
            for (uint8_t i = 0; i < animFrame; i++) display.print(".");
            break;
        case OLED_AP_MODE:
            display.setCursor(0, 0); display.println("Mode Setup");
            display.setCursor(0, 12); display.println("LED-SETUP-xxx");
            display.setCursor(0, 24); display.println("192.168.4.1");
            break;
        default:
            display.setCursor(0, 0); display.println(currentIP);
            display.setCursor(0, 12); display.print("WiFi OK");
            display.setCursor(0, 24); display.print("ArtNet ");
            display.print(artNetActive ? "<<<" : "---");
            break;
    }
    display.display();
}
#endif
