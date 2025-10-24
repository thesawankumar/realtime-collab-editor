# Use official OpenJDK 17 image
FROM eclipse-temurin:17-jdk-alpine

# Set working directory
WORKDIR /app

# Copy the jar file (after building with Maven)
COPY target/real-time-collaborative-text-app-0.0.1-SNAPSHOT.jar app.jar

# Expose port 8080
EXPOSE 8080

# Run the jar
ENTRYPOINT ["java", "-jar", "app.jar"]
