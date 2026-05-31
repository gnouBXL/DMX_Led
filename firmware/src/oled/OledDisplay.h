#pragma once
#ifdef HAS_OLED
#include <Adafruit_SSD1306.h>
#include <Adafruit_GFX.h>

enum OledState { OLED_BOOTING, OLED_WIFI_CONNECT, OLED_AP_MODE, OLED_ONLINE, OLED_ARTNET, OLED_NO_SIGNAL };

void oledInit();
void oledUpdate();
void oledSetState(OledState state);
void oledSetIP(const String& ip);
void oledSetArtNetActive(bool active);
#endif
