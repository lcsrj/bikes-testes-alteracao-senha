package br.edu.ifc.bikes.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.Clock;
import java.time.ZoneId;
import java.util.TimeZone;

@Configuration
public class SpringTimezoneConfig {
    private final ZoneId timezone;

    public SpringTimezoneConfig(@Value("${bikes.timezone:America/Sao_Paulo}") String timezone) {
        this.timezone = ZoneId.of(timezone);
    }

    @Bean
    public Clock applicationClock() { return Clock.system(timezone); }

    @PostConstruct //garante que o método seja executado logo após o construtor
                   // da classe inicializada pelo Spring
    public void timezoneConfig(){

        TimeZone.setDefault(TimeZone.getTimeZone(timezone));
    }
}
